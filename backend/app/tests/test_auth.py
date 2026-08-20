from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.core.config import settings
from app.tests.conftest import TestAccounts


def _login(client: TestClient, email: str, password: str) -> dict:
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def _authorization_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_login_with_correct_credentials_returns_access_token(
    client: TestClient, accounts: TestAccounts
) -> None:
    response = client.post(
        "/api/auth/login",
        data={"username": accounts.owner_email, "password": accounts.password},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"] == {
        "_id": str(accounts.owner_id),
        "email": accounts.owner_email,
        "role": "owner",
        "is_active": True,
    }


def test_login_with_incorrect_credentials_is_rejected(
    client: TestClient, accounts: TestAccounts
) -> None:
    response = client.post(
        "/api/auth/login",
        data={"username": accounts.owner_email, "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_disabled_user_cannot_log_in(client: TestClient, accounts: TestAccounts) -> None:
    response = client.post(
        "/api/auth/login",
        data={"username": accounts.disabled_email, "password": accounts.password},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Account is disabled"


def test_missing_token_is_rejected(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_expired_token_is_rejected(client: TestClient, accounts: TestAccounts) -> None:
    expired_token = jwt.encode(
        {
            "sub": str(accounts.owner_id),
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get("/api/auth/me", headers=_authorization_header(expired_token))

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_sales_executive_can_only_view_assigned_leads(
    client: TestClient, accounts: TestAccounts
) -> None:
    login = _login(client, accounts.executive_email, accounts.password)
    headers = _authorization_header(login["access_token"])

    list_response = client.get("/api/leads", headers=headers)
    assert list_response.status_code == 200
    leads = list_response.json()["data"]
    assert len(leads) == 1
    assert leads[0]["assigned_to"] == str(accounts.executive_id)

    other_lead_id = next(
        lead["_id"] for lead in client.app.mongodb.leads.documents
        if lead["assigned_to"] != str(accounts.executive_id)
    )
    detail_response = client.get(f"/api/leads/{other_lead_id}", headers=headers)
    assert detail_response.status_code == 403


def test_manager_can_view_team_leads(client: TestClient, accounts: TestAccounts) -> None:
    login = _login(client, accounts.manager_email, accounts.password)
    response = client.get(
        "/api/leads", headers=_authorization_header(login["access_token"])
    )

    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 2


def test_sales_executive_cannot_create_users(
    client: TestClient, accounts: TestAccounts
) -> None:
    login = _login(client, accounts.executive_email, accounts.password)
    response = client.post(
        "/api/users",
        headers=_authorization_header(login["access_token"]),
        json={
            "email": "new.user@example.com",
            "password": "AnotherPassword123!",
            "role": "sales_executive",
        },
    )

    assert response.status_code == 403
