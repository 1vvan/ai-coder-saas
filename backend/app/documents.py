"""Registry of supported legal document types (PL-5).

Each document type has a bespoke set of cover-page / key-terms fields (the
fill-ins that vary per agreement), plus the signature-block party roles and the
template file holding its verbatim Standard Terms. This registry is the single
source of truth: it drives the AI chat's field extraction, the frontend forms
and previews, and validation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FieldKind = Literal["text", "textarea", "date", "select", "number"]


@dataclass(frozen=True)
class Field:
    key: str
    label: str
    kind: FieldKind = "text"
    options: tuple[str, ...] = ()
    help: str = ""
    required: bool = True


@dataclass(frozen=True)
class DocumentType:
    slug: str
    title: str
    template_file: str
    description: str
    aliases: tuple[str, ...]
    party_roles: tuple[str, ...]
    fields: tuple[Field, ...]


def _party(*roles: str) -> tuple[str, ...]:
    return roles


# Common field builders keep the bespoke schemas readable without duplication.
def _effective_date() -> Field:
    return Field("effectiveDate", "Effective Date", "date")


def _governing_law() -> Field:
    return Field("governingLaw", "Governing Law (state)")


def _jurisdiction() -> Field:
    return Field("jurisdiction", "Jurisdiction (city/county and state)")


DOCUMENT_TYPES: tuple[DocumentType, ...] = (
    DocumentType(
        slug="mutual-nda",
        title="Mutual Non-Disclosure Agreement",
        template_file="Mutual-NDA.md",
        description="Mutual NDA letting each party disclose confidential information for a defined purpose.",
        aliases=("nda", "mutual nda", "mnda", "non-disclosure", "confidentiality agreement"),
        party_roles=_party("Party 1", "Party 2"),
        fields=(
            Field("purpose", "Purpose", "textarea", help="How Confidential Information may be used."),
            _effective_date(),
            Field(
                "mndaTerm",
                "MNDA Term",
                "select",
                options=(
                    "Expires a fixed number of years from the Effective Date",
                    "Continues until terminated",
                ),
            ),
            Field("mndaTermYears", "MNDA Term length (years)", "number", required=False,
                  help="Only if the term expires."),
            Field(
                "confidentialityTerm",
                "Term of Confidentiality",
                "select",
                options=(
                    "A fixed number of years from the Effective Date",
                    "In perpetuity",
                ),
            ),
            Field("confidentialityYears", "Confidentiality length (years)", "number", required=False,
                  help="Only if a fixed number of years."),
            _governing_law(),
            _jurisdiction(),
            Field("modifications", "MNDA Modifications", "textarea", required=False,
                  help="Optional changes to the standard terms."),
        ),
    ),
    DocumentType(
        slug="cloud-service-agreement",
        title="Cloud Service Agreement",
        template_file="CSA.md",
        description="Agreement for providing access to a hosted cloud (SaaS) service.",
        aliases=("csa", "cloud service", "saas agreement", "hosting agreement", "cloud agreement"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            Field("cloudService", "Cloud Service", "textarea", help="What the hosted service is."),
            _effective_date(),
            Field("subscriptionPeriod", "Subscription Period"),
            Field("technicalSupport", "Technical Support", "textarea", required=False),
            Field("fees", "Fees", "textarea"),
            Field("paymentProcess", "Payment Process", required=False),
            Field("useLimitations", "Use Limitations", "textarea", required=False),
            Field("nonRenewalNoticeDate", "Non-Renewal Notice Date", required=False),
            _governing_law(),
            _jurisdiction(),
        ),
    ),
    DocumentType(
        slug="design-partner-agreement",
        title="Design Partner Agreement",
        template_file="Design-Partner-Agreement.md",
        description="Early-access design partner program: partner gets early access and gives feedback.",
        aliases=("design partner", "early access agreement", "beta agreement"),
        party_roles=_party("Provider", "Partner"),
        fields=(
            Field("product", "Product", "textarea", help="The product the partner gets early access to."),
            Field("program", "Program", "textarea", help="Purpose of the design partner program."),
            _effective_date(),
            Field("term", "Term", help="How long the agreement lasts."),
            Field("fees", "Fees", "textarea", required=False),
            _governing_law(),
            _jurisdiction(),
        ),
    ),
    DocumentType(
        slug="service-level-agreement",
        title="Service Level Agreement",
        template_file="SLA.md",
        description="Service level terms for a cloud service: uptime, downtime, and service credits.",
        aliases=("sla", "service level", "uptime agreement"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            Field("targetUptime", "Target Uptime", help="e.g. 99.9%."),
            Field("scheduledDowntime", "Scheduled Downtime", "textarea", required=False),
            Field("supportChannel", "Support Channel", required=False),
            Field("targetResponseTime", "Target Response Time", required=False),
            Field("uptimeCredit", "Uptime Credit", "textarea", help="Credit when uptime targets are missed."),
            Field("responseTimeCredit", "Response Time Credit", "textarea", required=False),
            Field("subscriptionPeriod", "Subscription Period", required=False),
        ),
    ),
    DocumentType(
        slug="professional-services-agreement",
        title="Professional Services Agreement",
        template_file="PSA.md",
        description="Professional/consulting services delivered under statements of work (SOWs).",
        aliases=("psa", "professional services", "consulting agreement", "services agreement"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            Field("services", "Services", "textarea", help="Summary of the services / SOW."),
            _effective_date(),
            Field("fees", "Fees", "textarea"),
            Field("paymentProcess", "Payment Process", required=False),
            _governing_law(),
            _jurisdiction(),
        ),
    ),
    DocumentType(
        slug="data-processing-agreement",
        title="Data Processing Agreement",
        template_file="DPA.md",
        description="How a provider processes personal data on behalf of a customer.",
        aliases=("dpa", "data processing", "gdpr agreement", "data protection agreement"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            _effective_date(),
            Field("categoriesOfDataSubjects", "Categories of Data Subjects", "textarea"),
            Field("categoriesOfPersonalData", "Categories of Personal Data", "textarea"),
            Field("natureAndPurpose", "Nature and Purpose of Processing", "textarea"),
            Field("durationOfProcessing", "Duration of Processing", required=False),
            Field("subprocessors", "Subprocessors", "textarea", required=False),
            _governing_law(),
        ),
    ),
    DocumentType(
        slug="software-license-agreement",
        title="Software License Agreement",
        template_file="Software-License-Agreement.md",
        description="Licensing installable software to a customer.",
        aliases=("software license", "license agreement", "sla license", "eula"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            Field("software", "Software", "textarea", help="The licensed software."),
            _effective_date(),
            Field("permittedUses", "Permitted Uses", "textarea"),
            Field("licenseLimits", "License Limits", "textarea", required=False),
            Field("subscriptionPeriod", "Subscription Period", required=False),
            Field("fees", "Fees", "textarea"),
            Field("paymentProcess", "Payment Process", required=False),
            Field("warrantyPeriod", "Warranty Period", required=False),
            _governing_law(),
            _jurisdiction(),
        ),
    ),
    DocumentType(
        slug="partnership-agreement",
        title="Partnership Agreement",
        template_file="Partnership-Agreement.md",
        description="Business partnership defining each party's obligations, payment, IP, and cooperation.",
        aliases=("partnership", "business partnership", "collaboration agreement"),
        party_roles=_party("Party 1", "Party 2"),
        fields=(
            Field("obligations", "Obligations", "textarea", help="Each party's obligations."),
            _effective_date(),
            Field("paymentProcess", "Payment Process", required=False),
            Field("paymentSchedule", "Payment Schedule", required=False),
            Field("territory", "Territory", required=False),
            _governing_law(),
            _jurisdiction(),
        ),
    ),
    DocumentType(
        slug="pilot-agreement",
        title="Pilot Agreement",
        template_file="Pilot-Agreement.md",
        description="Time-limited pilot or evaluation of a product.",
        aliases=("pilot", "evaluation agreement", "poc agreement", "trial agreement"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            Field("product", "Product", "textarea", help="The product being piloted."),
            _effective_date(),
            Field("pilotPeriod", "Pilot Period"),
            Field("fees", "Fees", "textarea", required=False),
            Field("generalCapAmount", "General Cap Amount", required=False,
                  help="Liability cap amount."),
            _governing_law(),
            Field("chosenCourts", "Chosen Courts", required=False,
                  help="Where disputes are handled."),
        ),
    ),
    DocumentType(
        slug="business-associate-agreement",
        title="Business Associate Agreement",
        template_file="BAA.md",
        description="HIPAA business associate agreement governing use and disclosure of PHI.",
        aliases=("baa", "business associate", "hipaa agreement"),
        party_roles=_party("Provider (Business Associate)", "Company (Covered Entity)"),
        fields=(
            _effective_date(),
            Field("services", "Services", "textarea", help="Services involving PHI."),
            Field("permittedUsesAndDisclosures", "Permitted Uses and Disclosures", "textarea"),
            Field("limitations", "Limitations", "textarea", required=False),
            _governing_law(),
        ),
    ),
    DocumentType(
        slug="ai-addendum",
        title="AI Addendum",
        template_file="AI-Addendum.md",
        description="Addendum adding terms for AI-powered services to an existing agreement.",
        aliases=("ai addendum", "ai terms", "artificial intelligence addendum"),
        party_roles=_party("Provider", "Customer"),
        fields=(
            _effective_date(),
            Field("trainingData", "Training Data", "textarea", required=False),
            Field("trainingPurposes", "Training Purposes", "textarea", required=False),
            Field("trainingRestrictions", "Training Restrictions", "textarea", required=False),
            Field("improvementRestrictions", "Improvement Restrictions", "textarea", required=False),
        ),
    ),
)

_BY_SLUG = {doc.slug: doc for doc in DOCUMENT_TYPES}


def get_document_type(slug: str) -> DocumentType | None:
    return _BY_SLUG.get(slug)


def all_slugs() -> list[str]:
    return [doc.slug for doc in DOCUMENT_TYPES]


def _field_as_api(f: Field) -> dict:
    data = {"key": f.key, "label": f.label, "kind": f.kind, "required": f.required}
    if f.options:
        data["options"] = list(f.options)
    if f.help:
        data["help"] = f.help
    return data


def registry_as_api() -> list[dict]:
    """Serialize the registry for the API / frontend (camelCase)."""
    return [
        {
            "slug": doc.slug,
            "title": doc.title,
            "description": doc.description,
            "partyRoles": list(doc.party_roles),
            "fields": [_field_as_api(f) for f in doc.fields],
        }
        for doc in DOCUMENT_TYPES
    ]
