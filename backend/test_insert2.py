from app.db import get_cursor, init_pool
init_pool()
data = {
    "name": "Test Nulls",
    "category": "Sweets",
    "unit": "Units",
    "sell_type": "piece",
    "barcode": None,
    "price": None,
    "wholesale_price": None,
    "buy_price": None,
    "stock": None,
    "min_stock": None,
    "expiry": None,
    "critical_days": None,
    "manufacturer": "",
    "batch_no": "",
    "image": None,
    "initial_stock": None,
    "total_sold": 0
}
try:
    from app.query import insert
    res = insert("inventory", [data])
    print("Success:", res)
except Exception as e:
    print("Error:", str(e))
