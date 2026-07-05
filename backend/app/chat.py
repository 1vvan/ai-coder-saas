"""Drives the AI chat that populates a Mutual NDA via Cerebras/OpenRouter.

Uses LiteLLM against ``openrouter/openai/gpt-oss-120b`` with Cerebras pinned as
the inference provider, and Structured Outputs so the reply and the extracted
NDA fields come back as one validated object (see .claude/skills/cerebras).
"""

from __future__ import annotations

import json

from litellm import completion

from .models import AiChatResult, ChatRequest

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """\
You are Prelegal, a friendly legal assistant that helps a user draft a Common \
Paper Mutual Non-Disclosure Agreement (Mutual NDA) through natural conversation \
rather than a form.

Your job each turn:
1. Have a normal, freeform conversation. Briefly explain fields when helpful and \
ask about the details you still need, a couple at a time — never dump every \
question at once.
2. Extract any Mutual NDA cover-page values the user has given (across the whole \
conversation) into the `fields` object. Only set a field once you actually know \
it; leave everything else null. Do not invent or assume values.
3. Set `complete` to true only when every required field below is known.

The Mutual NDA cover-page fields:
- purpose: what confidential information will be used for.
- effectiveDate: the date the NDA takes effect, as ISO yyyy-mm-dd.
- ndaTermKind: "expires" (the NDA lasts a fixed number of years) or \
"untilTerminated" (continues until a party terminates it).
- ndaTermYears: integer number of years, required only when ndaTermKind is "expires".
- confidentialityKind: "years" (confidentiality lasts a number of years) or \
"perpetuity" (lasts forever).
- confidentialityYears: integer number of years, required only when \
confidentialityKind is "years".
- governingLaw: the US state whose law governs the agreement (e.g. "Delaware").
- jurisdiction: the city/county and state where disputes are handled \
(e.g. "New Castle, DE").
- modifications: optional free-text changes to the standard terms; null or empty if none.
- party1 and party2: each has printName, title, company, and noticeAddress \
(an email or postal address). printName and company are required for each party.

Required fields: purpose, effectiveDate, ndaTermKind (and ndaTermYears when \
"expires"), confidentialityKind (and confidentialityYears when "years"), \
governingLaw, jurisdiction, and printName + company for both parties. \
modifications, title, and noticeAddress are optional.

Keep `reply` warm and concise. When `complete` is true, tell the user their NDA \
is ready to preview and download.\
"""


def build_messages(req: ChatRequest) -> list[dict]:
    """Assemble the LiteLLM message list: system prompt + known values + history."""
    known = req.current_fields.model_dump(by_alias=True, exclude_none=True)
    system = SYSTEM_PROMPT
    if known:
        system += (
            "\n\nValues already captured (do not ask about these again unless the "
            "user wants to change them):\n" + json.dumps(known, indent=2)
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
