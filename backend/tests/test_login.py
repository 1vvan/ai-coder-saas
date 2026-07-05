"""Tests for the temporary database and the fake login endpoint (PL-3)."""

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
    temp_db.record_login("someone@example.com")
    assert temp_db.user_count() == 1
    temp_db.init_db()  # a fresh start wipes prior data
    assert temp_db.user_count() == 0


def test_login_records_user(temp_db):
    resp = client.post(
        "/api/login", json={"email": "jane@acme.com", "password": "whatever"}
    )
    assert resp.status_code == 200
    assert resp.json() == {"ok": True, "email": "jane@acme.com"}
    assert temp_db.user_count() == 1


def test_login_trims_email(temp_db):
    resp = client.post(
        "/api/login", json={"email": "  jane@acme.com  ", "password": "x"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "jane@acme.com"


def test_login_rejects_empty_email(temp_db):
    resp = client.post("/api/login", json={"email": "   ", "password": "x"})
    assert resp.status_code == 422
    assert temp_db.user_count() == 0
