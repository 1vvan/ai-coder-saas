"""Tests for the temporary database and real auth (PL-3 → PL-6)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import db as db_module
from app.main import app

client = TestClient(app)


@pytest.fixture()
def temp_db(monkeypatch, tmp_path):
    """Point the DB at a throwaway file and create it fresh."""
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "test.db"))
    db_module.init_db()
    return db_module


def test_init_db_creates_empty_users_table(temp_db):
    assert temp_db.user_count() == 0


def test_init_db_is_fresh_each_time(temp_db):
    temp_db.create_user("someone@example.com", "secret1")
    assert temp_db.user_count() == 1
    temp_db.init_db()  # a fresh start wipes prior data
    assert temp_db.user_count() == 0


def test_create_user_and_verify_credentials(temp_db):
    user_id = temp_db.create_user("jane@acme.com", "hunter2")
    assert temp_db.verify_credentials("jane@acme.com", "hunter2") == user_id
    # Email is case-insensitive.
    assert temp_db.verify_credentials("JANE@acme.com", "hunter2") == user_id
    # Wrong password fails.
    assert temp_db.verify_credentials("jane@acme.com", "nope") is None
    # Unknown user fails.
    assert temp_db.verify_credentials("nobody@acme.com", "hunter2") is None


def test_password_is_not_stored_in_plaintext(temp_db):
    temp_db.create_user("jane@acme.com", "hunter2")
    with temp_db._connect() as conn:
        row = conn.execute("SELECT password_hash, salt FROM users").fetchone()
    assert row["password_hash"] != "hunter2"
    assert row["salt"]


def test_duplicate_email_raises(temp_db):
    temp_db.create_user("jane@acme.com", "hunter2")
    with pytest.raises(temp_db.EmailTakenError):
        temp_db.create_user("jane@acme.com", "another")


def test_session_lifecycle(temp_db):
    user_id = temp_db.create_user("jane@acme.com", "hunter2")
    token = temp_db.create_session(user_id)
    user = temp_db.user_for_token(token)
    assert user == {"id": user_id, "email": "jane@acme.com"}
    temp_db.delete_session(token)
    assert temp_db.user_for_token(token) is None


# --- Endpoint tests ---------------------------------------------------------


def test_signup_returns_token(temp_db):
    resp = client.post(
        "/api/signup", json={"email": "jane@acme.com", "password": "hunter2"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "jane@acme.com"
    assert body["token"]
    assert temp_db.user_count() == 1


def test_signup_rejects_short_password(temp_db):
    resp = client.post("/api/signup", json={"email": "jane@acme.com", "password": "x"})
    assert resp.status_code == 422
    assert temp_db.user_count() == 0


def test_signup_rejects_duplicate_email(temp_db):
    client.post("/api/signup", json={"email": "jane@acme.com", "password": "hunter2"})
    resp = client.post(
        "/api/signup", json={"email": "jane@acme.com", "password": "hunter2"}
    )
    assert resp.status_code == 409


def test_login_after_signup(temp_db):
    client.post("/api/signup", json={"email": "jane@acme.com", "password": "hunter2"})
    resp = client.post(
        "/api/login", json={"email": "  jane@acme.com  ", "password": "hunter2"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "jane@acme.com"
    assert resp.json()["token"]


def test_login_wrong_password_401(temp_db):
    client.post("/api/signup", json={"email": "jane@acme.com", "password": "hunter2"})
    resp = client.post("/api/login", json={"email": "jane@acme.com", "password": "nope"})
    assert resp.status_code == 401


def test_login_unknown_user_401(temp_db):
    resp = client.post(
        "/api/login", json={"email": "ghost@acme.com", "password": "whatever"}
    )
    assert resp.status_code == 401


def test_me_requires_valid_token(temp_db):
    assert client.get("/api/me").status_code == 401
    assert (
        client.get("/api/me", headers={"Authorization": "Bearer bogus"}).status_code
        == 401
    )
    token = client.post(
        "/api/signup", json={"email": "jane@acme.com", "password": "hunter2"}
    ).json()["token"]
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "jane@acme.com"


def test_logout_invalidates_token(temp_db):
    token = client.post(
        "/api/signup", json={"email": "jane@acme.com", "password": "hunter2"}
    ).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/me", headers=headers).status_code == 200
    client.post("/api/logout", headers=headers)
    assert client.get("/api/me", headers=headers).status_code == 401
