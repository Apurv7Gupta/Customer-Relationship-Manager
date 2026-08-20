import requests

url = "http://localhost:8000/api/webhooks/whatsapp/mock"
payload = {
    "provider_message_id": "msg_12345",
    "sender_phone": "+919999999999",
    "message": "We need an ERP for our construction company. Please arrange a call tomorrow. Our budget is around 2 lakh.",
    "received_at": "2026-08-19T10:00:00Z",
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.text)
