from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..db import get_cursor
from ..auth import hash_password
from psycopg2.extras import Json

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
def get_users():
    with get_cursor() as cur:
        cur.execute("SELECT id, email, name, role, status, created_at, updated_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC")
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/")
def create_user(user: dict):
    with get_cursor(commit=True) as cur:
        # Check if email exists
        cur.execute("SELECT id FROM users WHERE email = %s", [user.get("email")])
        if cur.fetchone():
            return {"data": None, "error": {"message": "Email already exists"}}
            
        password = user.get("password") or "123456"
        hashed = hash_password(password)
        
        cur.execute("""
            INSERT INTO users (email, password, name, role, status)
            VALUES (%s, %s, %s, %s, %s) RETURNING id, email, name, role, status
        """, (user.get("email"), hashed, user.get("name"), user.get("role", "cashier"), user.get("status", "active")))
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/{user_id}")
def update_user(user_id: int, user: dict):
    if "password" in user:
        user["password"] = hash_password(user["password"])
        
    set_cols = list(user.keys())
    if not set_cols:
        return {"data": None, "error": {"message": "No data provided"}}
        
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(user.values())
    vals.append(user_id)
    
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE users SET {set_clause} WHERE id = %s RETURNING id, email, name, role, status", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.delete("/{user_id}")
def delete_user(user_id: int):
    with get_cursor(commit=True) as cur:
        cur.execute("UPDATE users SET deleted_at = now() WHERE id = %s RETURNING id, email, name", [user_id])
        return {"data": [dict(cur.fetchone())], "error": None}
