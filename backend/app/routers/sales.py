from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from ..db import get_cursor
import json
from psycopg2.extras import Json

router = APIRouter(prefix="/api/sales", tags=["sales"])

class SaleItemInput(BaseModel):
    inventory_id: int
    name: str
    qty: float
    price: float
    cost_price: float = 0
    total: float
    data: Optional[dict] = {}

class CheckoutInput(BaseModel):
    invoice_no: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    subtotal: float = 0
    discount: float = 0
    tax: float = 0
    total: float = 0
    paid: float = 0
    change_due: float = 0
    payment_method: str = 'cash'
    cashier: Optional[str] = None
    shift_id: Optional[int] = None
    items: List[SaleItemInput]

@router.get("/")
def get_sales(limit: int = 100):
    with get_cursor() as cur:
        cur.execute("SELECT * FROM sales ORDER BY created_at DESC LIMIT %s", [limit])
        sales_rows = [dict(r) for r in cur.fetchall()]
        
        # Optionally embed sale_items
        if sales_rows:
            ids = [s["id"] for s in sales_rows]
            ph = ",".join(["%s"] * len(ids))
            cur.execute(f"SELECT * FROM sale_items WHERE sale_id IN ({ph})", ids)
            items = [dict(i) for i in cur.fetchall()]
            
            items_by_sale = {}
            for item in items:
                items_by_sale.setdefault(item["sale_id"], []).append(item)
                
            for sale in sales_rows:
                sale["sale_items"] = items_by_sale.get(sale["id"], [])
                
        return {"data": sales_rows, "error": None}

@router.post("/checkout")
def checkout(payload: CheckoutInput):
    if not payload.items:
        return {"data": None, "error": {"message": "Cart is empty"}}

    profit = sum([(item.price - item.cost_price) * item.qty for item in payload.items])
    
    with get_cursor(commit=True) as cur:
        # 1. Insert main sale record
        cur.execute("""
            INSERT INTO sales (
                invoice_no, customer_id, customer_name, subtotal, discount, 
                tax, total, paid, change_due, payment_method, profit, cashier, shift_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (
            payload.invoice_no, payload.customer_id, payload.customer_name, 
            payload.subtotal, payload.discount, payload.tax, payload.total, 
            payload.paid, payload.change_due, payload.payment_method, 
            profit, payload.cashier, payload.shift_id
        ))
        
        sale = dict(cur.fetchone())
        sale_id = sale["id"]
        
        # 2. Insert sale items and update inventory
        sale_items_inserted = []
        for item in payload.items:
            cur.execute("""
                INSERT INTO sale_items (sale_id, inventory_id, name, qty, price, cost_price, total, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (
                sale_id, item.inventory_id, item.name, item.qty, item.price, 
                item.cost_price, item.total, Json(item.data or {})
            ))
            sale_items_inserted.append(dict(cur.fetchone()))
            
            # Update inventory stock
            cur.execute("""
                UPDATE inventory 
                SET stock = stock - %s, 
                    total_sold = total_sold + %s
                WHERE id = %s
            """, (item.qty, item.qty, item.inventory_id))
            
        sale["sale_items"] = sale_items_inserted
        return {"data": sale, "error": None}

@router.post("/return")
def sale_return(payload: CheckoutInput):
    # A sale return is basically a negative checkout
    if not payload.items:
        return {"data": None, "error": {"message": "Cart is empty"}}

    profit = sum([(item.price - item.cost_price) * item.qty for item in payload.items])
    
    with get_cursor(commit=True) as cur:
        # 1. Insert main return record (negative totals)
        cur.execute("""
            INSERT INTO sales (
                invoice_no, customer_id, customer_name, subtotal, discount, 
                tax, total, paid, change_due, payment_method, profit, cashier, shift_id, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Return') RETURNING *
        """, (
            payload.invoice_no, payload.customer_id, payload.customer_name, 
            -abs(payload.subtotal), -abs(payload.discount), -abs(payload.tax), -abs(payload.total), 
            -abs(payload.paid), 0, payload.payment_method, 
            -abs(profit), payload.cashier, payload.shift_id
        ))
        
        sale = dict(cur.fetchone())
        sale_id = sale["id"]
        
        # 2. Insert items and RESTORE inventory
        sale_items_inserted = []
        for item in payload.items:
            cur.execute("""
                INSERT INTO sale_items (sale_id, inventory_id, name, qty, price, cost_price, total, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
            """, (
                sale_id, item.inventory_id, item.name, -abs(item.qty), item.price, 
                item.cost_price, -abs(item.total), Json(item.data or {})
            ))
            sale_items_inserted.append(dict(cur.fetchone()))
            
            # Restore inventory stock (since item was returned)
            cur.execute("""
                UPDATE inventory 
                SET stock = stock + %s, 
                    total_sold = total_sold - %s
                WHERE id = %s
            """, (abs(item.qty), abs(item.qty), item.inventory_id))
            
        sale["sale_items"] = sale_items_inserted
        return {"data": sale, "error": None}

@router.post("/{sale_id}/reverse")
def reverse_sale(sale_id: int):
    with get_cursor(commit=True) as cur:
        # Check if already returned
        cur.execute("SELECT * FROM sales WHERE id = %s", [sale_id])
        sale = cur.fetchone()
        if not sale:
            return {"data": None, "error": {"message": "Sale not found"}}
            
        if sale["status"] == "Returned":
            return {"data": "ALREADY_RETURNED", "error": None}
            
        # Update original sale status
        cur.execute("UPDATE sales SET status = 'Returned' WHERE id = %s", [sale_id])
        
        # Get all sale items
        cur.execute("SELECT * FROM sale_items WHERE sale_id = %s", [sale_id])
        items = cur.fetchall()
        
        # Create negative return sale record
        cur.execute("""
            INSERT INTO sales (
                invoice_no, customer_id, customer_name, subtotal, discount, 
                tax, total, paid, change_due, payment_method, profit, cashier, shift_id, status, data
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Return', %s) RETURNING *
        """, (
            sale["invoice_no"], sale["customer_id"], sale["customer_name"], 
            -abs(sale["subtotal"] or 0), -abs(sale["discount"] or 0), -abs(sale["tax"] or 0), 
            -abs(sale["total"] or 0), -abs(sale["paid"] or 0), 0, sale["payment_method"], 
            -abs(sale["profit"] or 0), sale["cashier"], sale["shift_id"], Json({"reversed_from": sale_id})
        ))
        
        return_sale = dict(cur.fetchone())
        
        # Insert negative items and restore inventory
        for item in items:
            cur.execute("""
                INSERT INTO sale_items (sale_id, inventory_id, name, qty, price, cost_price, total, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                return_sale["id"], item["inventory_id"], item["name"], -abs(item["qty"] or 0), 
                item["price"], item["cost_price"], -abs(item["total"] or 0), Json(item["data"] or {})
            ))
            
            # Restore inventory stock
            if item["inventory_id"]:
                cur.execute("""
                    UPDATE inventory 
                    SET stock = stock + %s, 
                        total_sold = total_sold - %s
                    WHERE id = %s
                """, (abs(item["qty"] or 0), abs(item["qty"] or 0), item["inventory_id"]))
                
        return {"data": return_sale, "error": None}

@router.delete("/{sale_id}")
def delete_sale(sale_id: int):
    # Depending on business logic, maybe we want to restock items here?
    # For now, just delete the sale record. (ON DELETE CASCADE handles sale_items)
    with get_cursor(commit=True) as cur:
        cur.execute("DELETE FROM sales WHERE id = %s RETURNING *", [sale_id])
        deleted = cur.fetchone()
        if not deleted:
            return {"data": None, "error": {"message": "Sale not found"}}
        return {"data": dict(deleted), "error": None}
