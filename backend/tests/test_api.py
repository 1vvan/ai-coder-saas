"""Tests for the PL-3 foundation API: health, fake login, fresh DB."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app import db
from app.main import app


def test_health():
    with TestClient(app) as client:
        resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_fake_login_creates_user():
    with TestClient(app) as client:  # startup event recreates the DB
        resp = client.post("/api/login", json={"name": "Ada Lovelace", "email": "ada@example.com"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] >= 1
    assert body["name"] == "Ada Lovelace"
    assert body["email"] == "ada@example.com"
    assert body["createdAt"]  # camelCase alias present


def test_login_without_email_is_allowed():
    with TestClient(app) as client:
        resp = client.post("/api/login", json={"name": "Grace"})
    assert resp.status_code == 200
    assert resp.json()["email"] is None


def test_login_requires_name():
    with TestClient(app) as client:
        resp = client.post("/api/login", json={"name": "   "})
    assert resp.status_code == 422


def test_db_is_fresh_each_startup():
    # First boot: add a user.
    with TestClient(app) as client:
        client.post("/api/login", json={"name": "First"})
    # Second boot re-runs the startup event, which recreates the DB.
    with TestClient(app):
        pass
    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    assert count == 0
