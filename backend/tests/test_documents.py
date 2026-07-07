"""Tests for the document registry, Standard Terms parser, and endpoints (PL-5)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.documents import DOCUMENT_TYPES, all_slugs, get_document_type
from app.main import app
from app.terms import parse_terms

client = TestClient(app)


def test_registry_covers_all_eleven_types():
    assert len(DOCUMENT_TYPES) == 11
    # Every type points at a template that actually parses to some content.
    for doc in DOCUMENT_TYPES:
        assert doc.fields, f"{doc.slug} has no fields"
        assert parse_terms(doc.template_file), f"{doc.slug} terms did not parse"


def test_slugs_are_unique():
    slugs = all_slugs()
    assert len(slugs) == len(set(slugs))


def test_documents_endpoint_lists_types():
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    types = resp.json()["documentTypes"]
    assert len(types) == 11
    csa = next(t for t in types if t["slug"] == "cloud-service-agreement")
    assert csa["partyRoles"] == ["Provider", "Customer"]
    assert any(f["key"] == "fees" for f in csa["fields"])


def test_terms_endpoint_returns_verbatim_blocks():
    resp = client.get("/api/documents/mutual-nda/terms")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Mutual Non-Disclosure Agreement"
    blocks = body["terms"]
    assert len(blocks) > 3
    # Verbatim legal text is preserved (not generated).
    joined = " ".join(b["text"] for b in blocks)
    assert "Confidential Information" in joined


def test_terms_endpoint_unknown_type_404():
    resp = client.get("/api/documents/not-a-real-type/terms")
    assert resp.status_code == 404


def test_get_document_type_lookup():
    assert get_document_type("ai-addendum").title == "AI Addendum"
    assert get_document_type("nope") is None
