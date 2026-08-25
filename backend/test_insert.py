from app.db import get_cursor, init_pool
init_pool()
data = {
    "name": "Test",
    "category": "Sweets",
    "unit": "Units",
    "sell_type": "piece",
    "barcode": None,
    "price": 100.0,
    "wholesale_price": 100.0,
    "buy_price": 0.0,
    "stock": 10.0,
    "min_stock": 5,
    "expiry": None,
    "critical_days": 60,
    "manufacturer": "",
    "batch_no": "",
    "image": None,
    "initial_stock": 10.0,
    "total_sold": 0
}
try:
    from app.query import insert
    res = insert("inventory", [data])
    print("Success:", res)
except Exception as e:
    print("Error:", str(e))
