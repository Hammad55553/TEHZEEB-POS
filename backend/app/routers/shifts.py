from fastapi import APIRouter
from typing import List, Optional
from ..db import get_cursor
from psycopg2.extras import Json

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

@router.get("/")
def get_shifts(limit: int = 500):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM shifts ORDER BY opened_at DESC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/")
def open_shift(shift: dict):
    with get_cursor(commit=True) as cur:
        cols = list(shift.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = [Json(v) if isinstance(v, (dict, list)) else v for v in shift.values()]
        cur.execute(f"INSERT INTO shifts ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/{shift_id}")
def update_shift(shift_id: int, shift: dict):
    set_cols = list(shift.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = [Json(v) if isinstance(v, (dict, list)) else v for v in shift.values()]
    vals.append(shift_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE shifts SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.delete("/{shift_id}")
def delete_shift(shift_id: int):
    with get_cursor(commit=True) as cur:
        cur.execute("DELETE FROM shifts WHERE id = %s RETURNING *", [shift_id])
        return {"data": [dict(cur.fetchone())], "error": None}
