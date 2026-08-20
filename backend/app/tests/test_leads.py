from fastapi.testclient import TestClient

from app.tests.conftest import TestAccounts


def _login(client: TestClient, email: str, password: str) -> dict:
    response = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()


def _headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    token = _login(client, email, password)["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _new_lead_payload(phone: str = "+919876543210") -> dict:
    return {
        "name": "New Lead",
        "phone": phone,
        "email": "new.lead@example.com",
        "company": "Example Company",
        "source": "Website",
        "status": "new",
        "priority": "medium",
        "requirements": "Interested in CRM",
        "estimated_value": 150000,
    }


def test_owner_can_create_a_lead(client: TestClient, accounts: TestAccounts) -> None:
    response = client.post(
        "/api/leads",
        headers=_headers(client, accounts.owner_email, accounts.password),
        json=_new_lead_payload(),
    )

    assert response.status_code == 201
    created_lead = response.json()
    assert created_lead["name"] == "New Lead"
    assert created_lead["phone"] == "+919876543210"
    assert created_lead["status"] == "new"
    assert created_lead["assigned_to"] is None
    assert created_lead["created_by"] == str(accounts.owner_id)


def test_duplicate_lead_phone_is_rejected(
    client: TestClient, accounts: TestAccounts
) -> None:
    response = client.post(
        "/api/leads",
        headers=_headers(client, accounts.owner_email, accounts.password),
        json=_new_lead_payload(phone="+911111111111"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "A lead with this phone number already exists."


def test_lead_fields_can_be_updated(client: TestClient, accounts: TestAccounts) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    response = client.patch(
        f"/api/leads/{lead_id}",
        headers=_headers(client, accounts.owner_email, accounts.password),
        json={"status": "qualified", "priority": "high"},
    )

    assert response.status_code == 200
    updated_lead = response.json()
    assert updated_lead["status"] == "qualified"
    assert updated_lead["priority"] == "high"


def test_manager_can_assign_a_lead_to_sales_executive(
    client: TestClient, accounts: TestAccounts
) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    response = client.patch(
        f"/api/leads/{lead_id}",
        headers=_headers(client, accounts.manager_email, accounts.password),
        json={"assigned_to": str(accounts.other_executive_id)},
    )

    assert response.status_code == 200
    assert response.json()["assigned_to"] == str(accounts.other_executive_id)


def test_lead_list_supports_filters(client: TestClient, accounts: TestAccounts) -> None:
    response = client.get(
        "/api/leads",
        headers=_headers(client, accounts.manager_email, accounts.password),
        params={
            "status": "qualified",
            "priority": "high",
            "source": "WhatsApp",
            "assigned_to": str(accounts.other_executive_id),
        },
    )

    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 1
    assert response.json()["data"][0]["name"] == "Other Executive Lead"


def test_lead_list_is_paginated(client: TestClient, accounts: TestAccounts) -> None:
    response = client.get(
        "/api/leads",
        headers=_headers(client, accounts.manager_email, accounts.password),
        params={"page": 1, "page_size": 1},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["meta"] == {"page": 1, "page_size": 1, "total": 2, "total_pages": 2}


def test_invalid_lead_status_is_rejected(client: TestClient, accounts: TestAccounts) -> None:
    response = client.get(
        "/api/leads",
        headers=_headers(client, accounts.owner_email, accounts.password),
        params={"status": "not-a-status"},
    )

    assert response.status_code == 422


def test_invalid_assignee_is_rejected(client: TestClient, accounts: TestAccounts) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    response = client.patch(
        f"/api/leads/{lead_id}",
        headers=_headers(client, accounts.manager_email, accounts.password),
        json={"assigned_to": "not-a-real-user-id"},
    )

    assert response.status_code == 400
