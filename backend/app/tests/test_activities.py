from fastapi.testclient import TestClient

from app.tests.conftest import TestAccounts


def _headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_user_can_add_an_activity_manually(
    client: TestClient, accounts: TestAccounts
) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    response = client.post(
        "/api/activities",
        headers=_headers(client, accounts.owner_email, accounts.password),
        json={
            "lead_id": lead_id,
            "activity_type": "note",
            "description": "Customer requested a revised proposal.",
        },
    )

    assert response.status_code == 201
    activity = response.json()
    assert activity["lead_id"] == lead_id
    assert activity["activity_type"] == "note"
    assert activity["created_by"] == str(accounts.owner_id)


def test_status_change_creates_automatic_activity(
    client: TestClient, accounts: TestAccounts
) -> None:
    lead_id = str(client.app.mongodb.leads.documents[0]["_id"])
    response = client.patch(
        f"/api/leads/{lead_id}",
        headers=_headers(client, accounts.manager_email, accounts.password),
        json={"status": "qualified"},
    )

    assert response.status_code == 200
    activities = client.app.mongodb.activities.documents
    assert len(activities) == 1
    assert activities[0]["lead_id"] == lead_id
    assert activities[0]["activity_type"] == "status change"
    assert activities[0]["description"] == "Status changed from new to qualified"
    assert activities[0]["created_by"] == str(accounts.manager_id)
