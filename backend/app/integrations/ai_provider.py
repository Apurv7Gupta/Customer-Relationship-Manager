from typing import Protocol
from app.schemas.lead import LeadPriority, LeadStatus
from app.schemas.message import AIAnalysis


class AIProvider(Protocol):
    async def analyze_message(self, message: str) -> AIAnalysis:
        """Return a schema-validated AI suggestion for an inbound message."""


class MockAIProvider:
    """Deterministic development AI provider with no external model dependency."""

    async def analyze_message(self, message: str) -> AIAnalysis:
        return analyze_mock_message(message)


def analyze_mock_message(message: str) -> AIAnalysis:
    """Classify an inbound message into a validated, review-only AI suggestion."""
    normalized_message = message.strip()
    if not normalized_message:
        raise ValueError("A message is required for AI analysis")

    text = normalized_message.lower()
    escalation_terms = (
        "human",
        "person",
        "speak to",
        "call",
        "meeting",
        "price",
        "pricing",
        "cost",
        "budget",
        "negotia",
        "angry",
        "disappointed",
        "complaint",
        "legal",
        "contract",
    )
    requires_escalation = any(term in text for term in escalation_terms)

    if any(term in text for term in ("complaint", "angry", "disappointed")):
        intent = "complaint"
        sentiment = "negative"
        priority = LeadPriority.HIGH
        suggested_status = LeadStatus.CONTACTED
        suggested_next_action = "Have a manager review and contact the customer"
        escalation_reason = "Customer expressed dissatisfaction or a complaint"
    elif any(
        term in text for term in ("price", "pricing", "cost", "budget", "negotia")
    ):
        intent = "pricing_or_negotiation"
        sentiment = "neutral"
        priority = LeadPriority.HIGH
        suggested_status = LeadStatus.QUALIFIED
        suggested_next_action = "Prepare pricing details for human review"
        escalation_reason = "Customer requested pricing or negotiation"
    elif any(term in text for term in ("call", "meeting", "demo")):
        intent = "meeting_request"
        sentiment = "positive"
        priority = LeadPriority.HIGH
        suggested_status = LeadStatus.MEETING_SCHEDULED
        suggested_next_action = "Schedule a discovery call"
        escalation_reason = "Customer requested a call or meeting"
    elif any(term in text for term in ("legal", "contract")):
        intent = "legal_or_contractual_query"
        sentiment = "neutral"
        priority = LeadPriority.HIGH
        suggested_status = LeadStatus.CONTACTED
        suggested_next_action = "Route the request to a manager for review"
        escalation_reason = "Message involves legal or contractual concerns"
    elif any(
        term in text for term in ("crm", "erp", "requirement", "information", "service")
    ):
        intent = "product_requirement"
        sentiment = "positive"
        priority = LeadPriority.MEDIUM
        suggested_status = LeadStatus.QUALIFIED
        suggested_next_action = "Clarify requirements and arrange a discovery call"
        escalation_reason = None
    else:
        intent = "unknown"
        sentiment = "neutral"
        priority = LeadPriority.MEDIUM
        suggested_status = LeadStatus.NEW
        suggested_next_action = "Ask clarifying questions"
        escalation_reason = "AI could not confidently understand the message"
        requires_escalation = True

    confidence = 0.55 if intent == "unknown" else 0.91
    if "ignore previous" in text or "system prompt" in text:
        intent = "potential_prompt_injection"
        sentiment = "neutral"
        priority = LeadPriority.HIGH
        suggested_status = LeadStatus.NEW
        suggested_next_action = "Have a manager review the message"
        requires_escalation = True
        escalation_reason = "Message contains a potential prompt-injection attempt"
        confidence = 0.4

    response_data = {
        "intent": intent,
        "priority": priority,
        "sentiment": sentiment,
        "summary": f"Customer message: {normalized_message}",
        "suggested_status": suggested_status,
        "suggested_next_action": suggested_next_action,
        "requires_human_escalation": requires_escalation,
        "escalation_reason": escalation_reason,
        "reply_draft": (
            "Thank you for contacting us. We have received your message and "
            "will get back to you shortly."
        ),
        "confidence": confidence,
    }
    return AIAnalysis.model_validate(response_data)
