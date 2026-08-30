from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from ..db import get_cursor
from datetime import date
from psycopg2.extras import Json

router = APIRouter(prefix="/api/party", tags=["party"])

# --- Customers (Parties) ---
@router.get("/customers")
def get_customers():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY name ASC")
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/customers")
def create_customer(customer: dict):
    with get_cursor(commit=True) as cur:
        cols = list(customer.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = [Json(v) if isinstance(v, (dict, list)) else v for v in customer.values()]
        cur.execute(f"INSERT INTO customers ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/customers/{customer_id}")
def update_customer(customer_id: int, customer: dict):
    set_cols = list(customer.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = [Json(v) if isinstance(v, (dict, list)) else v for v in customer.values()]
    vals.append(customer_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE customers SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

# --- Suppliers ---
@router.get("/suppliers")
def get_suppliers():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM suppliers WHERE deleted_at IS NULL ORDER BY name ASC")
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/suppliers")
def create_supplier(supplier: dict):
    with get_cursor(commit=True) as cur:
        cols = list(supplier.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = [Json(v) if isinstance(v, (dict, list)) else v for v in supplier.values()]
        cur.execute(f"INSERT INTO suppliers ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/suppliers/{supplier_id}")
def update_supplier(supplier_id: int, supplier: dict):
    set_cols = list(supplier.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = [Json(v) if isinstance(v, (dict, list)) else v for v in supplier.values()]
    vals.append(supplier_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE suppliers SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

# --- Tasks ---
@router.get("/tasks")
def get_tasks(limit: int = 500):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY due_date ASC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/tasks")
def create_task(task: dict):
    with get_cursor(commit=True) as cur:
        cols = list(task.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = list(task.values())
        cur.execute(f"INSERT INTO tasks ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/tasks/{task_id}")
def update_task(task_id: int, task: dict):
    set_cols = list(task.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(task.values())
    vals.append(task_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE tasks SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

# --- Promises ---
@router.get("/promises")
def get_promises(limit: int = 500):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM promises WHERE deleted_at IS NULL ORDER BY promise_date ASC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/promises")
def create_promise(promise: dict):
    with get_cursor(commit=True) as cur:
        cols = list(promise.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = list(promise.values())
        cur.execute(f"INSERT INTO promises ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/promises/{promise_id}")
def update_promise(promise_id: int, promise: dict):
    set_cols = list(promise.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(promise.values())
    vals.append(promise_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE promises SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

# --- Salaries ---
@router.get("/salaries")
def get_salaries(limit: int = 500):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM salaries WHERE deleted_at IS NULL ORDER BY month DESC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/salaries")
def create_salary(salary: dict):
    with get_cursor(commit=True) as cur:
        cols = list(salary.keys())
        collist = ",".join(cols)
        ph = ",".join(["%s"] * len(cols))
        vals = list(salary.values())
        cur.execute(f"INSERT INTO salaries ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/salaries/{salary_id}")
def update_salary(salary_id: int, salary: dict):
    set_cols = list(salary.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(salary.values())
    vals.append(salary_id)
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE salaries SET {set_clause} WHERE id = %s RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}
