"""Temporary SQLite database for Prelegal (PL-3 → PL-6).

The database is intentionally throwaway: it is recreated from scratch on every
startup (per CLAUDE.md, "created from scratch each time the container is brought
up"). It backs real user accounts (email + salted password hash), opaque login
sessions, and the documents each user has generated so they can come back to
them.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Any, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "prelegal.db"

# PBKDF2-HMAC-SHA256 parameters. Stdlib-only so we add no dependency; the work
# factor is modest because this is a throwaway demo database.
_PBKDF2_ROUNDS = 120_000


def _db_path() -> Path:
    return Path(os.environ.get("PRELEGAL_DB_PATH", str(DEFAULT_DB_PATH)))


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """(Re)create the database fresh, dropping any existing data."""
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                doc_type TEXT NOT NULL,
                title TEXT NOT NULL,
                fields_json TEXT NOT NULL DEFAULT '{}',
                parties_json TEXT NOT NULL DEFAULT '[]',
                complete INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        conn.commit()


# --- Password hashing -------------------------------------------------------


def _hash_password(password: str, salt: str) -> str:
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ROUNDS
    )
    return derived.hex()


# --- Users & sessions -------------------------------------------------------


class EmailTakenError(Exception):
    """Raised when signing up with an email that already exists."""


def create_user(email: str, password: str) -> int:
    """Create a user with a salted password hash. Returns the new user id."""
    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)
    try:
        with _connect() as conn:
            cur = conn.execute(
                "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
                (email, password_hash, salt),
            )
            conn.commit()
            return int(cur.lastrowid)
    except sqlite3.IntegrityError as exc:  # UNIQUE(email)
        raise EmailTakenError(email) from exc


def verify_credentials(email: str, password: str) -> Optional[int]:
    """Return the user id if the email/password match, else None."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, password_hash, salt FROM users WHERE email = ?", (email,)
        ).fetchone()
    if row is None:
        return None
    candidate = _hash_password(password, row["salt"])
    if not hmac.compare_digest(candidate, row["password_hash"]):
        return None
    return int(row["id"])


def create_session(user_id: int) -> str:
    """Create an opaque session token for a user."""
    token = secrets.token_urlsafe(32)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id)
        )
        conn.commit()
    return token


def delete_session(token: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()


def user_for_token(token: str) -> Optional[dict[str, Any]]:
    """Return {'id', 'email'} for a valid session token, else None."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT users.id AS id, users.email AS email
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    return {"id": int(row["id"]), "email": row["email"]} if row else None


def user_count() -> int:
    with _connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]


# --- Documents --------------------------------------------------------------


def _document_row_to_dict(row: sqlite3.Row, *, include_body: bool) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": int(row["id"]),
        "docType": row["doc_type"],
        "title": row["title"],
        "complete": bool(row["complete"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }
    if include_body:
        data["fields"] = json.loads(row["fields_json"])
        data["parties"] = json.loads(row["parties_json"])
    return data


def save_document(
    user_id: int,
    doc_type: str,
    title: str,
    fields: dict[str, str],
    parties: list[dict[str, Any]],
    complete: bool,
    document_id: Optional[int] = None,
) -> Optional[dict[str, Any]]:
    """Insert a new document or update an existing one owned by the user.

    Returns the saved document (with body), or None if ``document_id`` was given
    but does not belong to the user.
    """
    fields_json = json.dumps(fields)
    parties_json = json.dumps(parties)
    with _connect() as conn:
        if document_id is not None:
            cur = conn.execute(
                """
                UPDATE documents
                SET doc_type = ?, title = ?, fields_json = ?, parties_json = ?,
                    complete = ?, updated_at = datetime('now')
                WHERE id = ? AND user_id = ?
                """,
                (
                    doc_type,
                    title,
                    fields_json,
                    parties_json,
                    int(complete),
                    document_id,
                    user_id,
                ),
            )
            if cur.rowcount == 0:
                return None
            saved_id = document_id
        else:
            cur = conn.execute(
                """
                INSERT INTO documents
                    (user_id, doc_type, title, fields_json, parties_json, complete)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    doc_type,
                    title,
                    fields_json,
                    parties_json,
                    int(complete),
                ),
            )
            saved_id = int(cur.lastrowid)
        conn.commit()
    return get_document(user_id, saved_id)


def list_documents(user_id: int) -> list[dict[str, Any]]:
    """Return the user's documents (summaries only), newest first."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
            (user_id,),
        ).fetchall()
    return [_document_row_to_dict(row, include_body=False) for row in rows]


def get_document(user_id: int, document_id: int) -> Optional[dict[str, Any]]:
    """Return a full document owned by the user, or None."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        ).fetchone()
    return _document_row_to_dict(row, include_body=True) if row else None


def delete_document(user_id: int, document_id: int) -> bool:
    """Delete a document owned by the user. Returns True if one was removed."""
    with _connect() as conn:
        cur = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
