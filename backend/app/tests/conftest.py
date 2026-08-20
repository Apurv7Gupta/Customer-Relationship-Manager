import os
from contextlib import asynccontextmanager
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

os.environ.setdefault("MONGODB_URI", "mongodb://test-host:27017")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.main import app


def _matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
    for field, expected in query.items():
        if field == "$or":
            return any(_matches(document, clause) for clause in expected)
        if document.get(field) != expected:
            return False
    return True


class MockCursor:
    def __init__(self, documents: list[dict[str, Any]]):
        self.documents = deepcopy(documents)

    def sort(self, field: str, direction: int) -> "MockCursor":
        self.documents.sort(
            key=lambda document: document.get(field), reverse=direction == -1
        )
        return self

    def skip(self, count: int) -> "MockCursor":
        self.documents = self.documents[count:]
        return self

    def limit(self, count: int) -> "MockCursor":
        self.documents = self.documents[:count]
        return self

    async def to_list(self, length: int) -> list[dict[str, Any]]:
        return self.documents[:length]


@dataclass(frozen=True)
class MockInsertResult:
    inserted_id: ObjectId


@dataclass(frozen=True)
class MockUpdateResult:
    matched_count: int
    modified_count: int


class MockCollection:
    def __init__(self, documents: list[dict[str, Any]] | None = None):
        self.documents = documents or []

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for document in self.documents:
            if _matches(document, query):
                return deepcopy(document)
        return None

    def find(self, query: dict[str, Any]) -> MockCursor:
        return MockCursor(
            [document for document in self.documents if _matches(document, query)]
        )

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(_matches(document, query) for document in self.documents)

    async def insert_one(self, document: dict[str, Any]) -> MockInsertResult:
        stored_document = deepcopy(document)
        stored_document.setdefault("_id", ObjectId())
        self.documents.append(stored_document)
        return MockInsertResult(inserted_id=stored_document["_id"])

    async def insert_many(self, documents: list[dict[str, Any]]) -> None:
        for document in documents:
            await self.insert_one(document)

    async def update_one(
        self, query: dict[str, Any], update: dict[str, dict[str, Any]]
    ) -> MockUpdateResult:
        for document in self.documents:
            if _matches(document, query):
                for field, value in update.get("$set", {}).items():
                    document[field] = value
                return MockUpdateResult(matched_count=1, modified_count=1)
        return MockUpdateResult(matched_count=0, modified_count=0)

    async def create_index(self, *args: Any, **kwargs: Any) -> None:
        return None


class MockMongoDatabase:
    def __init__(self, users: list[dict[str, Any]], leads: list[dict[str, Any]]):
        self.users = MockCollection(users)
        self.leads = MockCollection(leads)
        self.activities = MockCollection()
        self.follow_ups = MockCollection()
        self.messages = MockCollection()
        self.escalations = MockCollection()


@dataclass(frozen=True)
class TestAccounts:
    owner_id: ObjectId
    manager_id: ObjectId
    executive_id: ObjectId
    other_executive_id: ObjectId
    disabled_user_id: ObjectId
    owner_email: str = "owner@example.com"
    manager_email: str = "manager@example.com"
    executive_email: str = "executive@example.com"
    disabled_email: str = "disabled@example.com"
    password: str = "CorrectPassword123!"


@pytest.fixture
def accounts() -> TestAccounts:
    return TestAccounts(
        owner_id=ObjectId(),
        manager_id=ObjectId(),
        executive_id=ObjectId(),
        other_executive_id=ObjectId(),
        disabled_user_id=ObjectId(),
    )


@pytest.fixture
def mock_database(accounts: TestAccounts) -> MockMongoDatabase:
    now = datetime.now(timezone.utc)
    users = [
        {
            "_id": accounts.owner_id,
            "email": accounts.owner_email,
            "role": "owner",
            "is_active": True,
            "hashed_password": get_password_hash(accounts.password),
        },
        {
            "_id": accounts.manager_id,
            "email": accounts.manager_email,
            "role": "sales_manager",
            "is_active": True,
            "hashed_password": get_password_hash(accounts.password),
        },
        {
            "_id": accounts.executive_id,
            "email": accounts.executive_email,
            "role": "sales_executive",
            "is_active": True,
            "hashed_password": get_password_hash(accounts.password),
        },
        {
            "_id": accounts.other_executive_id,
            "email": "other.executive@example.com",
            "role": "sales_executive",
            "is_active": True,
            "hashed_password": get_password_hash(accounts.password),
        },
        {
            "_id": accounts.disabled_user_id,
            "email": accounts.disabled_email,
            "role": "sales_executive",
            "is_active": False,
            "hashed_password": get_password_hash(accounts.password),
        },
    ]
    leads = [
        {
            "_id": ObjectId(),
            "name": "Assigned Lead",
            "phone": "+911111111111",
            "email": "assigned@example.com",
            "company": None,
            "source": "Website",
            "status": "new",
            "priority": "medium",
            "assigned_to": str(accounts.executive_id),
            "requirements": None,
            "estimated_value": None,
            "next_follow_up_at": None,
            "created_by": str(accounts.owner_id),
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": ObjectId(),
            "name": "Other Executive Lead",
            "phone": "+912222222222",
            "email": "other@example.com",
            "company": None,
            "source": "WhatsApp",
            "status": "qualified",
            "priority": "high",
            "assigned_to": str(accounts.other_executive_id),
            "requirements": None,
            "estimated_value": None,
            "next_follow_up_at": None,
            "created_by": str(accounts.owner_id),
            "created_at": now,
            "updated_at": now,
        },
    ]
    return MockMongoDatabase(users=users, leads=leads)


@pytest.fixture
def client(mock_database: MockMongoDatabase):
    @asynccontextmanager
    async def mock_lifespan(application):
        application.mongodb = mock_database
        yield

    original_lifespan = app.router.lifespan_context
    app.router.lifespan_context = mock_lifespan
    with TestClient(app) as test_client:
        yield test_client
    app.router.lifespan_context = original_lifespan
