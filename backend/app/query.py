"""Generic query engine that mirrors the subset of Database/PostgREST
semantics the POS frontend actually uses.

The frontend sends operations like:
    from('inventory').select('*').is('deleted_at', null).order('id')
    from('sales').select('*, sale_items(*)')
    from('customers').update({...}).eq('id', 5)

We translate a small JSON description of that into safe parameterised SQL.
Only whitelisted tables are reachable.
"""
from typing import Any
from .db import get_cursor

# Whitelisted tables and their child (embedded) relations for nested selects.
TABLES = {
    "users", "inventory", "customers", "suppliers", "sales",
    "sale_items", "expenses", "shifts", "shortage", "orders",
    "tasks", "promises", "salaries", "stock_moves",
}

# Nested "embed" support: table -> {embed_name: (child_table, fk_column)}
EMBEDS = {
    "sales": {
        "sale_items": ("sale_items", "sale_id"),
    },
}

# Operators the frontend uses -> SQL fragments
OPS = {
    "eq": "=",
    "neq": "!=",
    "gt": ">",
    "gte": ">=",
    "lt": "<",
    "lte": "<=",
    "like": "LIKE",
    "ilike": "ILIKE",
}


def _check_table(table: str):
    if table not in TABLES:
        raise ValueError(f"table not allowed: {table}")


def _build_where(filters: list[dict], params: list) -> str:
    """filters = [{col, op, value}]  op in OPS or 'is'/'not_is'/'in'."""
    if not filters:
        return ""
    clauses = []
    for f in filters:
        col = f["col"]
        op = f.get("op", "eq")
        val = f.get("value")
        # basic identifier guard
        if not col.replace("_", "").isalnum():
            raise ValueError(f"bad column: {col}")
        if op == "is":
            if val is None:
                clauses.append(f"{col} IS NULL")
            else:
                clauses.append(f"{col} IS %s"); params.append(val)
        elif op == "not_is":
            if val is None:
                clauses.append(f"{col} IS NOT NULL")
            else:
                clauses.append(f"{col} IS NOT %s"); params.append(val)
        elif op == "in":
            vals = val if isinstance(val, list) else [val]
            ph = ",".join(["%s"] * len(vals)) or "NULL"
            clauses.append(f"{col} IN ({ph})"); params.extend(vals)
        elif op in OPS:
            if op == "ilike" and val is not None and "%" not in str(val):
                val = f"%{val}%"
            clauses.append(f"{col} {OPS[op]} %s"); params.append(val)
        else:
            raise ValueError(f"unsupported op: {op}")
    return " WHERE " + " AND ".join(clauses)


def select(table: str, body: dict) -> list[dict]:
    _check_table(table)
    filters = body.get("filters", [])
    embed = body.get("embed", [])       # list of embed names e.g. ['sale_items']
    order = body.get("order")           # {'col':..,'asc':bool}
    limit = body.get("limit")
    offset = body.get("offset")         # for pagination: skip N rows
    single = body.get("single", False)
    want_count = body.get("count", False)  # also return total row count

    params: list = []
    where = _build_where(filters, params)

    # optional total count (for pagination "how many pages")
    total = None
    if want_count:
        with get_cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS c FROM {table}{where}", list(params))
            row = cur.fetchone()
            total = int(row["c"]) if row else 0

    sql = f"SELECT * FROM {table}{where}"
    if order and order.get("col"):
        oc = order["col"]
        if oc.replace("_", "").isalnum():
            sql += f" ORDER BY {oc} {'ASC' if order.get('asc', True) else 'DESC'}"
    if limit:
        sql += " LIMIT %s"; params.append(int(limit))
    if offset:
        sql += " OFFSET %s"; params.append(int(offset))

    with get_cursor() as cur:
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

        # handle embeds (only the ones we declared)
        for emb in embed:
            table_embeds = EMBEDS.get(table, {})
            if emb not in table_embeds:
                continue
            child_table, fk = table_embeds[emb]
            ids = [r["id"] for r in rows]
            children_by_parent: dict[Any, list] = {}
            if ids:
                ph = ",".join(["%s"] * len(ids))
                cur.execute(f"SELECT * FROM {child_table} WHERE {fk} IN ({ph})", ids)
                for c in cur.fetchall():
                    children_by_parent.setdefault(c[fk], []).append(dict(c))
            for r in rows:
                r[emb] = children_by_parent.get(r["id"], [])

    if single:
        return rows[0] if rows else None
    if want_count:
        return {"rows": rows, "total": total}
    return rows


def _clean_row(table: str, data: dict) -> dict:
    """Split known columns vs unknown -> unknown go into `data` JSONB if table has it."""
    return data  # columns are permissive (JSONB `data` catches extras at call sites)


def insert(table: str, rows: list[dict]) -> list[dict]:
    _check_table(table)
    if not rows:
        return []
    out = []
    with get_cursor(commit=True) as cur:
        for row in rows:
            row = _clean_row(table, row)
            cols = list(row.keys())
            if not cols:
                cur.execute(f"INSERT INTO {table} DEFAULT VALUES RETURNING *")
            else:
                collist = ",".join(cols)
                ph = ",".join(["%s"] * len(cols))
                vals = [_coerce(row[c]) for c in cols]
                cur.execute(
                    f"INSERT INTO {table} ({collist}) VALUES ({ph}) RETURNING *", vals
                )
            out.append(dict(cur.fetchone()))
    return out


def update(table: str, data: dict, filters: list[dict]) -> list[dict]:
    _check_table(table)
    data = _clean_row(table, data)
    set_cols = list(data.keys())
    if not set_cols:
        return []
    params: list = [_coerce(data[c]) for c in set_cols]
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    where = _build_where(filters, params)
    sql = f"UPDATE {table} SET {set_clause}{where} RETURNING *"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def delete(table: str, filters: list[dict]) -> list[dict]:
    _check_table(table)
    params: list = []
    where = _build_where(filters, params)
    if not where:
        raise ValueError("refusing to delete without a filter")
    sql = f"DELETE FROM {table}{where} RETURNING *"
    with get_cursor(commit=True) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def _coerce(v):
    """psycopg2 needs dict/list wrapped as Json for JSONB columns."""
    import json
    from psycopg2.extras import Json
    if isinstance(v, (dict, list)):
        return Json(v)
    return v
