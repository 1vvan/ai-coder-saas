"""Drives the AI chat that drafts any supported legal document (PL-4/PL-5).

Uses LiteLLM against ``openrouter/openai/gpt-oss-120b`` with Cerebras pinned as
the inference provider, and Structured Outputs so each turn returns the reply,
the detected document type, and the extracted fields as one validated object
(see .claude/skills/cerebras).
"""

from __future__ import annotations

import json

from litellm import completion

from .documents import DOCUMENT_TYPES
from .models import AiChatResult, ChatRequest

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


def _catalog_description() -> str:
    lines: list[str] = []
    for doc in DOCUMENT_TYPES:
        fields = "; ".join(
            f"{f.key} ({f.label}{'' if f.required else ', optional'}"
            + (f" — options: {', '.join(f.options)}" if f.options else "")
            + ")"
            for f in doc.fields
        )
        parties = ", ".join(doc.party_roles)
        lines.append(
            f"- {doc.slug}: {doc.title}. Parties: {parties}. Fields: {fields}"
        )
    return "\n".join(lines)


SYSTEM_PROMPT = f"""\
You are Prelegal, a friendly assistant that drafts legal agreements with the
user through natural conversation. You can ONLY generate the following supported
document types (slug: title, parties, and the fields to collect):

{_catalog_description()}

Each turn, return a structured result:
1. If the document type is not yet decided, work out which supported type the
   user wants and set `documentType` to its slug. Confirm briefly what you're
   drafting.
2. If the user asks for a document that is NOT in the supported list above (for
   example an employment agreement, a will, a lease), set `unsupported` to true,
   set `suggestedType` to the slug of the closest supported document, and in
   `reply` explain that you can't generate that document but offer the closest
   one you can — then ask if they'd like it. Do not set `documentType` in that
   case unless the user accepts the suggestion.
3. Once a type is active, ask about and extract that type's fields. Return known
   values in `fields` as a list of {{key, value}} using ONLY that type's field
   keys listed above. Collect the signature parties in `parties` (each with the
   role from the type's parties list, plus printName, company, and optionally
   title and noticeAddress). Only include what you actually know; never invent
   values. Ask about missing details a couple at a time.
4. Set `complete` to true only when every required field and each party's
   printName and company are known.

Use ISO yyyy-mm-dd for dates. Keep `reply` warm and concise. When `complete` is
true, tell the user their document is ready to preview and download.\
"""


def build_messages(req: ChatRequest) -> list[dict]:
    """Assemble the LiteLLM message list: system prompt + current state + history."""
    state = {
        "documentType": req.document_type,
        "fields": {f.key: f.value for f in req.fields},
        "parties": [p.model_dump(by_alias=True, exclude_none=True) for p in req.parties],
    }
    system = SYSTEM_PROMPT
    if req.document_type or req.fields or req.parties:
        system += (
            "\n\nCurrent draft state (do not re-ask for values already known "
            "unless the user wants to change them):\n" + json.dumps(state, indent=2)
        )
    messages: list[dict] = [{"role": "system", "content": system}]
    messages.extend({"role": m.role, "content": m.content} for m in req.messages)
    return messages


def run_chat(req: ChatRequest) -> AiChatResult:
    """Call the LLM and return its validated structured result."""
    response = completion(
        model=MODEL,
        messages=build_messages(req),
        response_format=AiChatResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    content = response.choices[0].message.content
    return AiChatResult.model_validate_json(content)
