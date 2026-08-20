import requests

url = "http://localhost:8000/api/webhooks/whatsapp/mock"
payload = {
    "invalid _data": 0000,
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.text)

"""422
{"detail":[{"type":"missing","loc":["body","provider_message_id"],"msg":"Field required","input":{"invalid _data":0}},{"type":"missing","loc":["body","sender_phone"],"msg":"Field required","input":{"invalid _data":0}},{"type":"missing","loc":["body","message"],"msg":"Field required","input":{"invalid _data":0}},{"type":"missing","loc":["body","received_at"],"msg":"Field required","input":{"invalid _data":0}}]}"""
