from fastapi import APIRouter
from typing import List, Optional
from ..db import get_cursor
from psycopg2.extras import Json

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

@router.get("/")
def get_expenses(limit: int = 500):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/")
def create_expense(expense: dict):
    with get_cursor(commit=True) as cur:
        cols = list(expense.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = [Json(v) if isinstance(v, (dict, list)) else v for v in expense.values()]
        cur.execute(f"INSERT INTO expenses ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/{expense_id}")
def update_expense(expense_id: int, expense: dict):
    set_cols = list(expense.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = [Json(v) if isinstance(v, (dict, list)) else v for v in expense.values()]
    vals.append(expense_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE expenses SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.delete("/{expense_id}")
def delete_expense(expense_id: int):
    with get_cursor(commit=True) as cur:
        cur.execute("UPDATE expenses SET deleted_at = now() WHERE id = %s RETURNING *", [expense_id])
        return {"data": [dict(cur.fetchone())], "error": None}
