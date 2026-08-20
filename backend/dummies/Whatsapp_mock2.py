import requests

url = "http://localhost:8000/api/webhooks/whatsapp/mock"

payload = {
    "provider_message_id": "msg_67890",
    "sender_phone": "+911111111111",
    "message": "I am extremely frustrated with your pricing. Let me speak to a manager immediately!",
    "received_at": "2026-08-19T10:05:00Z",
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.text)

print("Successful")
