"""SQLite persistence for the Prelegal V1 foundation (PL-3).

The database is a *temporary* store that is created from scratch every time the
app starts (mirroring the "fresh DB each container start" requirement). It holds
a single ``users`` table that is the seat for real sign up / sign in later; for
now the foundation only performs a *fake* login (no password, no auth) that
records whoever walks in.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

# The DB file location can be overridden (Docker sets it to a writable path).
# Default lives next to the backend package so local dev "just works".
DB_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", Path(__file__).resolve().parent / "prelegal.db"))

_SCHEMA = """
CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect() -> sqlite3.Connection:
    """Open a connection with row access by column name."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Recreate the database from scratch.

    Deletes any existing file first so every startup begins with an empty,
    freshly-schema'd database — no migrations, no stale rows.
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    with connect() as conn:
        conn.executescript(_SCHEMA)


def create_user(name: str, email: str | None) -> dict:
    """Insert a user row and return it as a plain dict.

    This is the "fake login": we never check a password, we simply record the
    person entering the platform so the rest of the app has a user to work with.
    """
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (name, email),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
    return dict(row)
