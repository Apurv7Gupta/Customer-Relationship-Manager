import os
import requests
from dotenv import load_dotenv

load_dotenv()

backend_url = os.getenv("BACKEND_URL") or "http://localhost:8000"

url = f"{backend_url}/api/webhooks/whatsapp/mock"

payload = {
    "provider_message_id": "msg_78801",
    "sender_phone": "+917777777777",
    "message": "Can you tell me the pricing details?",
    "received_at": "2026-08-19T10:05:00Z",
}

response = requests.post(url, json=payload)

print(response.status_code)
print(response.text)
print("\n\n\nSuccessful")
