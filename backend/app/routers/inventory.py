from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from ..db import get_cursor

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

@router.get("/products")
def get_products():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM inventory ORDER BY name ASC")
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/products")
def add_product(product: dict):
    # Basic validation
    if not product.get("name"):
        return {"data": None, "error": {"message": "Product name is required"}}
        
    cols = list(product.keys())
    if not cols:
        return {"data": None, "error": {"message": "No product data provided"}}
        
    collist = ",".join(cols)
    ph = ",".join(["%s"] * len(cols))
    vals = list(product.values())
    
    with get_cursor(commit=True) as cur:
        cur.execute(f"INSERT INTO inventory ({collist}) VALUES ({ph}) RETURNING *", vals)
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/products/{product_id}")
def update_product(product_id: int, product: dict):
    if not product:
        return {"data": None, "error": {"message": "No data provided to update"}}
        
    set_cols = list(product.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(product.values())
    vals.append(product_id)
    
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE inventory SET {set_clause} WHERE id = %s RETURNING *", vals)
        updated = cur.fetchone()
        if not updated:
             return {"data": None, "error": {"message": "Product not found"}}
        return {"data": [dict(updated)], "error": None}

@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    with get_cursor(commit=True) as cur:
        cur.execute("DELETE FROM inventory WHERE id = %s RETURNING *", [product_id])
        deleted = cur.fetchone()
        if not deleted:
             return {"data": None, "error": {"message": "Product not found"}}
        return {"data": [dict(deleted)], "error": None}

# --- Stock Moves (Adjustments, Transfers, Returns) ---

class StockMoveInput(BaseModel):
    move_type: str
    product_id: int
    product_name: str
    qty: float
    reason: str
    done_by: str
    from_loc: Optional[str] = None
    to_loc: Optional[str] = None

@router.get("/moves")
def get_stock_moves(limit: int = 100):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM stock_moves WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT %s", [limit])
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/moves")
def create_stock_move(move: StockMoveInput):
    with get_cursor(commit=True) as cur:
        # First, insert the stock move record
        cur.execute("""
            INSERT INTO stock_moves (move_type, product_id, product_name, qty, reason, done_by, from_loc, to_loc)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (move.move_type, move.product_id, move.product_name, move.qty, move.reason, move.done_by, move.from_loc, move.to_loc))
        move_record = dict(cur.fetchone())
        
        # Then, update the actual stock based on move_type
        if move.move_type == 'adjustment':
            # In frontend, adjustment is calculated as delta and passed in qty. So we just add delta to stock.
            cur.execute("UPDATE inventory SET stock = stock + %s WHERE id = %s", (move.qty, move.product_id))
        elif move.move_type == 'purchase_return':
            # Purchase return decreases stock
            cur.execute("UPDATE inventory SET stock = stock - %s WHERE id = %s", (move.qty, move.product_id))
        # 'transfer' doesn't change total stock, just records the movement
        
        return {"data": [move_record], "error": None}

# --- Shortage Book ---

class ShortageInput(BaseModel):
    name: str
    qty: float = 0.0
    resolved: bool = False
    note: Optional[str] = ''

@router.get("/shortage")
def get_shortage():
    with get_cursor() as cur:
        cur.execute("SELECT * FROM shortage ORDER BY qty DESC")
        return {"data": [dict(r) for r in cur.fetchall()], "error": None}

@router.post("/shortage")
def add_shortage(item: ShortageInput):
    with get_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO shortage (name, qty, resolved, note)
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (item.name, item.qty, item.resolved, item.note))
        return {"data": [dict(cur.fetchone())], "error": None}

@router.put("/shortage/{item_id}")
def update_shortage(item_id: int, item: dict):
    if not item:
        return {"data": None, "error": {"message": "No data provided"}}
    set_cols = list(item.keys())
    set_clause = ", ".join(f"{c} = %s" for c in set_cols)
    vals = list(item.values())
    vals.append(item_id)
    
    with get_cursor(commit=True) as cur:
        cur.execute(f"UPDATE shortage SET {set_clause} WHERE id = %s RETURNING *", vals)
        updated = cur.fetchone()
        if not updated:
            return {"data": None, "error": {"message": "Shortage item not found"}}
        return {"data": [dict(updated)], "error": None}

@router.delete("/shortage/{item_id}")
def delete_shortage(item_id: int):
    with get_cursor(commit=True) as cur:
        cur.execute("DELETE FROM shortage WHERE id = %s RETURNING *", [item_id])
        deleted = cur.fetchone()
        if not deleted:
            return {"data": None, "error": {"message": "Shortage item not found"}}
        return {"data": [dict(deleted)], "error": None}
