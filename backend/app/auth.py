"""Local auth: bcrypt password hashing + JWT, replacing Database Auth."""
from __future__ import annotations
import datetime as dt

import bcrypt
import jwt

from . import config
from .db import get_cursor


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user: dict) -> str:
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user.get("role", "cashier"),
        "exp": dt.datetime.utcnow() + dt.timedelta(hours=config.JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except Exception:
        return None


def get_user_by_email(email: str) -> dict | None:
    with get_cursor() as cur:
        cur.execute("SELECT * FROM users WHERE lower(email) = lower(%s)", (email,))
        row = cur.fetchone()
        return dict(row) if row else None


def create_user(email: str, password: str, name: str = "", role: str = "cashier") -> dict:
    with get_cursor(commit=True) as cur:
        cur.execute(
            "INSERT INTO users (email, password, name, role) VALUES (%s,%s,%s,%s) RETURNING *",
            (email, hash_password(password), name, role),
        )
        return dict(cur.fetchone())


def ensure_default_admin():
    """Create a first admin so the shop can log in on a fresh install."""
    if not get_user_by_email(config.DEFAULT_ADMIN_EMAIL):
        create_user(
            config.DEFAULT_ADMIN_EMAIL,
            config.DEFAULT_ADMIN_PASSWORD,
            name="Store Admin",
            role="admin",
        )
        print(f"[auth] created default admin: {config.DEFAULT_ADMIN_EMAIL} / "
              f"{config.DEFAULT_ADMIN_PASSWORD}")
