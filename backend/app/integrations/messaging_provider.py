from typing import Protocol
from uuid import uuid4


class MessagingProvider(Protocol):
    async def send_message(self, recipient: str, message: str) -> str:
        """Send a message and return the provider's message identifier."""


class MockWhatsAppProvider:
    """Development-only messaging provider with no external side effects."""

    async def send_message(self, recipient: str, message: str) -> str:
        if not recipient.strip():
            raise ValueError("A recipient is required")
        if not message.strip():
            raise ValueError("A message is required")

        return f"mock_message_{uuid4().hex}"
