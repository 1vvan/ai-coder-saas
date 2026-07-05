"""Temporary SQLite database for the V1 foundation (PL-3).

The database is intentionally throwaway: it is recreated from scratch on every
startup (per CLAUDE.md, "created from scratch each time the container is brought
up"). For now it only records fake logins — there is no real authentication yet.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "prelegal.db"


def _db_path() -> Path:
    return Path(os.environ.get("PRELEGAL_DB_PATH", str(DEFAULT_DB_PATH)))


def init_db() -> None:
    """(Re)create the database fresh, dropping any existing data."""
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    with sqlite3.connect(path) as conn:
        conn.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()


def record_login(email: str) -> None:
    """Record a (fake) login. Passwords are never stored — there is no auth."""
    with sqlite3.connect(_db_path()) as conn:
        conn.execute("INSERT INTO users (email) VALUES (?)", (email,))
        conn.commit()


def user_count() -> int:
    with sqlite3.connect(_db_path()) as conn:
        return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
