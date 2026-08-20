from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi.testclient import TestClient

from app.tests.conftest import MockMongoDatabase, TestAccounts


def _headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_sales_executive_can_create_and_complete_follow_up(
    client: TestClient, accounts: TestAccounts
) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    headers = _headers(client, accounts.executive_email, accounts.password)
    create_response = client.post(
        "/api/followups",
        headers=headers,
        json={
            "lead_id": lead_id,
            "description": "Call the customer to discuss requirements.",
            "due_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "assigned_to": str(accounts.executive_id),
        },
    )

    assert create_response.status_code == 201
    follow_up = create_response.json()
    assert follow_up["status"] == "pending"
    assert follow_up["assigned_to"] == str(accounts.executive_id)

    complete_response = client.patch(
        f"/api/followups/{follow_up['_id']}",
        headers=headers,
        json={"status": "completed"},
    )

    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "completed"
    assert any(
        activity["activity_type"] == "follow-up completed"
        for activity in client.app.mongodb.activities.documents
    )


def test_pending_past_due_follow_up_is_returned_as_overdue(
    client: TestClient, accounts: TestAccounts, mock_database: MockMongoDatabase
) -> None:
    now = datetime.now(timezone.utc)
    mock_database.follow_ups.documents.append(
        {
            "_id": ObjectId(),
            "lead_id": str(mock_database.leads.documents[0]["_id"]),
            "description": "Overdue customer call",
            "due_at": now - timedelta(hours=1),
            "assigned_to": str(accounts.executive_id),
            "status": "pending",
            "created_by": str(accounts.owner_id),
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
        }
    )

    response = client.get(
        "/api/followups",
        headers=_headers(client, accounts.executive_email, accounts.password),
    )

    assert response.status_code == 200
    assert response.json()["data"][0]["status"] == "overdue"
