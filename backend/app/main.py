"""Tahzeeb Sweets & Super Store - POS  |  FastAPI backend (local/offline)."""
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional

from . import config, auth, query
from .db import init_pool, close_pool
from .routers import inventory, sales, users, orders, reports, party, expenses, shifts

app = FastAPI(title=config.APP_NAME)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(reports.router)
app.include_router(party.router)
app.include_router(expenses.router)
app.include_router(shifts.router)

# Electron/Vite dev + file:// origins — allow all locally.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_pool()
    auth.ensure_default_admin()
    from .db import ensure_sample_products
    ensure_sample_products()


@app.on_event("shutdown")
def _shutdown():
    close_pool()


@app.get("/health")
def health():
    return {"ok": True, "app": config.APP_NAME}

import time
from fastapi import Request

GLOBAL_LAST_UPDATE = time.time()

@app.middleware("http")
async def update_global_timestamp(request: Request, call_next):
    response = await call_next(request)
    if request.method in ["POST", "PUT", "DELETE"] and response.status_code < 400:
        global GLOBAL_LAST_UPDATE
        GLOBAL_LAST_UPDATE = time.time()
    return response

@app.get("/network/sync")
def get_network_sync():
    return {"last_update": GLOBAL_LAST_UPDATE}

import socket
import time
from fastapi import Request

active_clients = {}

@app.post("/network/heartbeat")
async def network_heartbeat(request: Request, body: dict):
    # body contains {"role": "cashier", "username": "Admin"} etc
    ip = request.client.host
    active_clients[ip] = {
        "ip": ip,
        "role": body.get("role", "client"),
        "user": body.get("user", "Unknown"),
        "last_seen": time.time()
    }
    return {"ok": True}

@app.get("/network/clients")
def get_network_clients():
    now = time.time()
    # clean up clients older than 15 seconds
    dead_ips = [ip for ip, data in active_clients.items() if now - data["last_seen"] > 15]
    for ip in dead_ips:
        del active_clients[ip]
    return {"clients": list(active_clients.values())}

@app.get("/network/info")
def network_info():
    ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    return {"ip": ip}

# ------------------------------------------------------------------ AUTH
class LoginIn(BaseModel):
    email: str
    password: str


class SignupIn(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""
    role: Optional[str] = "cashier"


class PasswordIn(BaseModel):
    email: Optional[str] = None
    password: str


def _auth_response(user: dict):
    token = auth.make_token(user)
    safe = {k: v for k, v in user.items() if k != "password"}
    # shape mimics database: { data:{ user, session }, error:null }
    return {
        "data": {
            "user": safe,
            "session": {"access_token": token, "user": safe},
        },
        "error": None,
    }


@app.post("/auth/signin")
def signin(body: LoginIn):
    user = auth.get_user_by_email(body.email)
    if not user or not auth.verify_password(body.password, user["password"]):
        return {"data": {"user": None, "session": None},
                "error": {"message": "Invalid email or password"}}
    if user.get("status") == "disabled":
        return {"data": {"user": None, "session": None},
                "error": {"message": "Account disabled"}}
    return _auth_response(user)


@app.post("/auth/signup")
def signup(body: SignupIn):
    if auth.get_user_by_email(body.email):
        return {"data": {"user": None, "session": None},
                "error": {"message": "User already exists"}}
    user = auth.create_user(body.email, body.password, body.name or "", body.role or "cashier")
    return _auth_response(user)


@app.get("/auth/session")
def session(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "").strip()
    payload = auth.decode_token(token) if token else None
    if not payload:
        return {"data": {"session": None}, "error": None}
    user = auth.get_user_by_email(payload.get("email", ""))
    if not user:
        return {"data": {"session": None}, "error": None}
    safe = {k: v for k, v in user.items() if k != "password"}
    return {"data": {"session": {"access_token": token, "user": safe}}, "error": None}


@app.post("/auth/update-password")
def update_password(body: PasswordIn, authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "").strip()
    payload = auth.decode_token(token) if token else None
    if not payload:
        raise HTTPException(401, "not authenticated")
    email = body.email or payload.get("email")
    with __import__("app.db", fromlist=["get_cursor"]).get_cursor(commit=True) as cur:
        cur.execute("UPDATE users SET password=%s WHERE lower(email)=lower(%s)",
                    (auth.hash_password(body.password), email))
    return {"data": {}, "error": None}


@app.post("/auth/reset-password")
def reset_password(body: PasswordIn):
    # Offline: no email. Reset directly to a temp password (admin action).
    email = body.email
    user = auth.get_user_by_email(email) if email else None
    if not user:
        return {"data": {}, "error": {"message": "No such user"}}
    with __import__("app.db", fromlist=["get_cursor"]).get_cursor(commit=True) as cur:
        cur.execute("UPDATE users SET password=%s WHERE id=%s",
                    (auth.hash_password(body.password or "temp123"), user["id"]))
    return {"data": {}, "error": None}


# ------------------------------------------------------------------ DATA
class SelectIn(BaseModel):
    filters: list[dict] = []
    embed: list[str] = []
    order: Optional[dict] = None
    limit: Optional[int] = None
    single: bool = False


class InsertIn(BaseModel):
    rows: list[dict]


class UpdateIn(BaseModel):
    data: dict
    filters: list[dict] = []


class DeleteIn(BaseModel):
    filters: list[dict] = []


def _wrap(fn):
    try:
        return {"data": fn(), "error": None}
    except Exception as e:  # noqa
        return {"data": None, "error": {"message": str(e)}}


@app.post("/db/{table}/select")
def db_select(table: str, body: SelectIn):
    return _wrap(lambda: query.select(table, body.model_dump()))


@app.post("/db/{table}/insert")
def db_insert(table: str, body: InsertIn):
    return _wrap(lambda: query.insert(table, body.rows))


@app.post("/db/{table}/update")
def db_update(table: str, body: UpdateIn):
    return _wrap(lambda: query.update(table, body.data, body.filters))


@app.post("/db/{table}/delete")
def db_delete(table: str, body: DeleteIn):
    return _wrap(lambda: query.delete(table, body.filters))


# ============================================================
# BACKUP / RESTORE  (full data as one JSON file)
# ============================================================
_BACKUP_TABLES = [
    "users", "inventory", "customers", "suppliers",
    "sales", "sale_items", "orders", "expenses",
    "shifts", "shortage", "tasks", "promises", "salaries", "stock_moves",
]

def _get_cursor(commit=False):
    return __import__("app.db", fromlist=["get_cursor"]).get_cursor(commit=commit)

@app.get("/backup")
def backup_data():
    """Return the whole database as one JSON object (all tables)."""
    import datetime, json as _json
    out = {"_meta": {"app": config.APP_NAME, "created_at": datetime.datetime.now().isoformat(), "version": 1}, "tables": {}}
    with _get_cursor() as cur:
        for t in _BACKUP_TABLES:
            try:
                cur.execute(f"SELECT * FROM {t}")
                rows = [dict(r) for r in cur.fetchall()]
                # make datetimes/decimals JSON-safe
                out["tables"][t] = _json.loads(_json.dumps(rows, default=str))
            except Exception as e:
                out["tables"][t] = []
    return out

class RestoreIn(BaseModel):
    tables: dict
    mode: Optional[str] = "replace"   # replace | merge

@app.post("/restore")
def restore_data(body: RestoreIn):
    """Restore data from a backup JSON. mode=replace wipes existing rows first."""
    tables = body.tables or {}
    counts = {}
    # insert parents before children (FK safety)
    order = [t for t in _BACKUP_TABLES if t in tables]
    with _get_cursor(commit=True) as cur:
        if (body.mode or "replace") == "replace":
            # wipe children first, then parents (reverse), CASCADE handles refs
            for t in reversed(_BACKUP_TABLES):
                if t in tables:
                    try: cur.execute(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
                    except Exception: pass
        for t in order:
            rows = tables.get(t) or []
            n = 0
            for row in rows:
                if not row: continue
                cols = list(row.keys())
                collist = ",".join(cols)
                ph = ",".join(["%s"] * len(cols))
                vals = [ (__import__("json").dumps(v) if isinstance(v,(dict,list)) else v) for v in row.values() ]
                try:
                    cur.execute(f"INSERT INTO {t} ({collist}) VALUES ({ph})", vals)
                    n += 1
                except Exception:
                    pass
            counts[t] = n
            # fix id sequence
            try:
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{t}','id'), COALESCE((SELECT MAX(id) FROM {t}),1))")
            except Exception:
                pass
    return {"data": {"restored": counts, "mode": body.mode}, "error": None}
