from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timedelta
from ..db import get_cursor

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/sales-summary")
def get_sales_summary(start_date: Optional[str] = None, end_date: Optional[str] = None):
    # If no dates provided, default to today
    if not start_date:
         start_date = datetime.now().strftime('%Y-%m-%d 00:00:00')
    if not end_date:
         end_date = datetime.now().strftime('%Y-%m-%d 23:59:59')
         
    with get_cursor() as cur:
        # Get total sales, total profit, and order count in date range
        cur.execute("""
            SELECT 
                COUNT(id) as total_orders,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(SUM(profit), 0) as total_profit
            FROM sales 
            WHERE created_at >= %s AND created_at <= %s AND deleted_at IS NULL
        """, [start_date, end_date])
        summary = dict(cur.fetchone())
        
        return {"data": summary, "error": None}

@router.get("/top-products")
def get_top_products(limit: int = 10):
    with get_cursor() as cur:
        # Get top selling products by quantity
        cur.execute("""
            SELECT 
                inventory_id,
                name,
                SUM(qty) as total_qty_sold,
                SUM(total) as total_revenue
            FROM sale_items
            GROUP BY inventory_id, name
            ORDER BY total_qty_sold DESC
            LIMIT %s
        """, [limit])
        top_products = [dict(r) for r in cur.fetchall()]
        
        return {"data": top_products, "error": None}

@router.get("/daily-sales")
def get_daily_sales(days: int = 7):
    with get_cursor() as cur:
        # Get sales grouped by date for the last X days
        cur.execute("""
            SELECT 
                DATE(created_at) as sale_date,
                SUM(total) as revenue,
                SUM(profit) as profit
            FROM sales
            WHERE created_at >= CURRENT_DATE - %s * INTERVAL '1 day'
              AND deleted_at IS NULL
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """, [days])
        daily_sales = [dict(r) for r in cur.fetchall()]
        
        return {"data": daily_sales, "error": None}

@router.get("/product-insights/{product_name}")
def get_product_insights(product_name: str):
    with get_cursor() as cur:
        # First find matching sale_items
        # Since we need to join with sales, we'll fetch them together
        cur.execute("""
            SELECT 
                si.*,
                row_to_json(s.*) as sales
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE si.name ILIKE %s
        """, [f"%{product_name}%"])
        
        transactions = [dict(r) for r in cur.fetchall()]
        return {"data": transactions, "error": None}
