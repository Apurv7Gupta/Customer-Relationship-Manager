import asyncio
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api import webhooks
from app.schemas.lead import LeadPriority, LeadStatus
from app.schemas.message import AIAnalysis


class StubAIProvider:
    def __init__(self, analysis: AIAnalysis):
        self.analysis = analysis

    async def analyze_message(self, message: str) -> AIAnalysis:
        return self.analysis


class FailingAIProvider:
    def __init__(self, error: Exception):
        self.error = error

    async def analyze_message(self, message: str) -> AIAnalysis:
        raise self.error


def _payload(provider_message_id: str, phone: str, message: str) -> dict:
    return {
        "provider_message_id": provider_message_id,
        "sender_phone": phone,
        "message": message,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


def _analysis(
    *, confidence: float = 0.91, requires_human_escalation: bool = False,
    escalation_reason: str | None = None,
) -> AIAnalysis:
    return AIAnalysis(
        intent="product_requirement",
        priority=LeadPriority.MEDIUM,
        sentiment="positive",
        summary="Customer is interested in CRM services.",
        suggested_status=LeadStatus.QUALIFIED,
        suggested_next_action="Schedule a discovery call",
        requires_human_escalation=requires_human_escalation,
        escalation_reason=escalation_reason,
        reply_draft="Thank you for your interest. We will arrange a discovery call.",
        confidence=confidence,
    )


def test_webhook_stores_valid_ai_response(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(webhooks, "ai_provider", StubAIProvider(_analysis()))

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-valid-ai", "+919999999999", "I need a CRM."),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "processed"
    assert body["ai_analysis"]["intent"] == "product_requirement"
    assert body["ai_analysis"]["confidence"] == 0.91
    assert body["escalation_created"] is False


def test_webhook_uses_fallback_when_ai_returns_invalid_json(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(
        webhooks, "ai_provider", FailingAIProvider(ValueError("Invalid AI JSON"))
    )

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-invalid-ai", "+918888888888", "Please help."),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["ai_analysis"]["intent"] == "analysis_failed"
    assert body["escalation_created"] is True
    assert client.app.mongodb.messages.documents[0]["ai_error"] == "Invalid AI JSON"


def test_webhook_uses_fallback_when_ai_times_out(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(
        webhooks, "ai_provider", FailingAIProvider(asyncio.TimeoutError("AI timed out"))
    )

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-timeout", "+917777777777", "Please help."),
    )

    assert response.status_code == 201
    assert response.json()["ai_analysis"]["intent"] == "analysis_failed"
    assert response.json()["escalation_created"] is True


def test_low_confidence_ai_response_creates_escalation(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(
        webhooks,
        "ai_provider",
        StubAIProvider(_analysis(confidence=0.2, escalation_reason="Low confidence")),
    )

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-low-confidence", "+916666666666", "I need help."),
    )

    assert response.status_code == 201
    assert response.json()["escalation_created"] is True
    assert client.app.mongodb.escalations.documents[0]["reason"] == "Low confidence"


def test_customer_requested_escalation_is_created(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(
        webhooks,
        "ai_provider",
        StubAIProvider(
            _analysis(
                requires_human_escalation=True,
                escalation_reason="Customer requested to speak with a person",
            )
        ),
    )

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-human", "+915555555555", "I need to speak to a person."),
    )

    assert response.status_code == 201
    assert response.json()["escalation_created"] is True
    assert (
        client.app.mongodb.escalations.documents[0]["reason"]
        == "Customer requested to speak with a person"
    )


def test_duplicate_webhook_does_not_create_duplicate_records(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(webhooks, "ai_provider", StubAIProvider(_analysis()))
    payload = _payload("message-duplicate", "+914444444444", "I need a CRM.")

    first_response = client.post("/api/webhooks/whatsapp/mock", json=payload)
    duplicate_response = client.post("/api/webhooks/whatsapp/mock", json=payload)

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 201
    assert duplicate_response.json()["status"] == "already_processed"
    assert len(client.app.mongodb.messages.documents) == 1
    assert len(client.app.mongodb.leads.documents) == 3


def test_webhook_matches_existing_lead_by_phone(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(webhooks, "ai_provider", StubAIProvider(_analysis()))
    existing_lead = client.app.mongodb.leads.documents[0]

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-existing-lead", existing_lead["phone"], "I need a CRM."),
    )

    assert response.status_code == 201
    assert response.json()["lead_id"] == str(existing_lead["_id"])
    assert len(client.app.mongodb.leads.documents) == 2


def test_webhook_creates_new_lead_for_unknown_phone(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr(webhooks, "ai_provider", StubAIProvider(_analysis()))

    response = client.post(
        "/api/webhooks/whatsapp/mock",
        json=_payload("message-new-lead", "+913333333333", "I need a CRM."),
    )

    assert response.status_code == 201
    assert len(client.app.mongodb.leads.documents) == 3
    new_lead = client.app.mongodb.leads.documents[-1]
    assert new_lead["phone"] == "+913333333333"
    assert new_lead["source"] == "WhatsApp"
