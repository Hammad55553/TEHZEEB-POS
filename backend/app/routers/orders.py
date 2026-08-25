from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from ..db import get_cursor
from psycopg2.extras import Json
from datetime import date

router = APIRouter(prefix="/api/orders", tags=["orders"])

class OrderInput(BaseModel):
    supplier: Optional[str] = None
    supplier_id: Optional[int] = None
    items: List[dict] = []
    total: float = 0
    status: str = 'pending'
    notes: Optional[str] = None
    order_type: str = 'purchase_order'
    party_name: Optional[str] = None
    party_id: Optional[int] = None
    expected_date: Optional[date] = None
    done_by: Optional[str] = None

@router.get("/")
def get_orders(limit: int = 100, order_type: Optional[str] = None):
    with get_cursor() as cur:
        if order_type:
            cur.execute("SELECT * FROM orders WHERE deleted_at IS NULL AND order_type = %s ORDER BY created_at DESC LIMIT %s", [order_type, limit])
        else:
            cur.execute("SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/")
def create_order(order: OrderInput):
    with get_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO orders (
                supplier, supplier_id, items, total, status, notes, 
                order_type, party_name, party_id, expected_date, done_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (
            order.supplier, order.supplier_id, Json(order.items), order.total, 
            order.status, order.notes, order.order_type, order.party_name, 
            order.party_id, order.expected_date, order.done_by
        ))
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/{order_id}")
def update_order(order_id: int, order: dict):
    if not order:
        return {"data": None, "error": {"message": "No data to update"}}
        
    set_cols = []
    vals = []
    for k, v in order.items():
        if k == 'items':
            v = Json(v)
        set_cols.append(f"{k} = %s")
        vals.append(v)
        
    vals.append(order_id)
    set_clause = ", ".join(set_cols)
    
    with get_cursor(commit=True) as cur:
        # Check if the order is being marked as 'received' to update inventory stock
        if order.get("status") == "received":
            cur.execute("SELECT items, status FROM orders WHERE id = %s", [order_id])
            existing = cur.fetchone()
            if existing and existing["status"] != "received":
                items = order.get("items") or existing["items"]
                # Update stock for each item in the order
                for item in items:
                    product_id = item.get("id") or item.get("product_id")
                    qty = float(item.get("qty") or 0)
                    if product_id and qty > 0:
                        cur.execute("UPDATE inventory SET stock = stock + %s WHERE id = %s", (qty, product_id))

        cur.execute(f"UPDATE orders SET {set_clause} WHERE id = %s RETURNING *", vals)
        updated = cur.fetchone()
        if not updated:
            return {"data": None, "error": {"message": "Order not found"}}
        return {"data": [dict(updated)], "error": None}

@router.delete("/{order_id}")
def delete_order(order_id: int):
    with get_cursor(commit=True) as cur:
        # Soft delete
        cur.execute("UPDATE orders SET deleted_at = now() WHERE id = %s RETURNING *", [order_id])
        deleted = cur.fetchone()
        if not deleted:
            return {"data": None, "error": {"message": "Order not found"}}
        return {"data": [dict(deleted)], "error": None}
