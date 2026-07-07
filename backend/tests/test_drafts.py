"""Tests for per-user saved documents / drafts (PL-6)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import db as db_module
from app.main import app

client = TestClient(app)


@pytest.fixture()
def temp_db(monkeypatch, tmp_path):
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "test.db"))
    db_module.init_db()
    return db_module


def _auth(email: str = "jane@acme.com", password: str = "hunter2") -> dict[str, str]:
    token = client.post(
        "/api/signup", json={"email": email, "password": password}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_drafts_require_auth(temp_db):
    assert client.get("/api/drafts").status_code == 401
    assert client.post("/api/drafts", json={"documentType": "mutual-nda"}).status_code == 401


def test_save_and_list_draft(temp_db):
    headers = _auth()
    resp = client.post(
        "/api/drafts",
        headers=headers,
        json={
            "documentType": "mutual-nda",
            "fields": [{"key": "purpose", "value": "Explore a partnership"}],
            "parties": [{"role": "Party 1", "printName": "Jane", "company": "Acme"}],
            "complete": False,
        },
    )
    assert resp.status_code == 200
    saved = resp.json()
    assert saved["id"]
    assert saved["docType"] == "mutual-nda"
    # Title defaults to the type + a party company.
    assert saved["title"] == "Mutual Non-Disclosure Agreement — Acme"

    listing = client.get("/api/drafts", headers=headers).json()
    assert len(listing) == 1
    assert listing[0]["id"] == saved["id"]


def test_get_draft_returns_body(temp_db):
    headers = _auth()
    saved = client.post(
        "/api/drafts",
        headers=headers,
        json={
            "documentType": "pilot-agreement",
            "fields": [{"key": "product", "value": "Widget"}],
            "parties": [{"role": "Provider", "company": "Acme"}],
        },
    ).json()
    got = client.get(f"/api/drafts/{saved['id']}", headers=headers).json()
    assert got["docType"] == "pilot-agreement"
    assert {"key": "product", "value": "Widget"} in got["fields"]
    assert got["parties"][0]["company"] == "Acme"


def test_update_draft_in_place(temp_db):
    headers = _auth()
    saved = client.post(
        "/api/drafts",
        headers=headers,
        json={"documentType": "mutual-nda", "title": "Draft A"},
    ).json()
    updated = client.post(
        "/api/drafts",
        headers=headers,
        json={
            "id": saved["id"],
            "documentType": "mutual-nda",
            "title": "Draft A",
            "fields": [{"key": "purpose", "value": "Updated"}],
            "complete": True,
        },
    ).json()
    assert updated["id"] == saved["id"]
    assert updated["complete"] is True
    # Still a single document (updated, not duplicated).
    assert len(client.get("/api/drafts", headers=headers).json()) == 1


def test_unknown_document_type_rejected(temp_db):
    headers = _auth()
    resp = client.post(
        "/api/drafts", headers=headers, json={"documentType": "not-real"}
    )
    assert resp.status_code == 422


def test_delete_draft(temp_db):
    headers = _auth()
    saved = client.post(
        "/api/drafts", headers=headers, json={"documentType": "mutual-nda"}
    ).json()
    assert client.delete(f"/api/drafts/{saved['id']}", headers=headers).status_code == 200
    assert client.get("/api/drafts", headers=headers).json() == []
    assert client.delete(f"/api/drafts/{saved['id']}", headers=headers).status_code == 404


def test_drafts_are_scoped_per_user(temp_db):
    alice = _auth("alice@acme.com")
    bob = _auth("bob@acme.com")
    saved = client.post(
        "/api/drafts", headers=alice, json={"documentType": "mutual-nda"}
    ).json()
    # Bob cannot see or fetch Alice's document.
    assert client.get("/api/drafts", headers=bob).json() == []
    assert client.get(f"/api/drafts/{saved['id']}", headers=bob).status_code == 404
