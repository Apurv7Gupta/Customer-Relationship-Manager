from contextlib import asynccontextmanager
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, leads, activities, followups


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URI)
    app.mongodb = app.mongodb_client[settings.DATABASE_NAME]

    # Indexes based on actual query patterns
    await app.mongodb.leads.create_index([("assigned_to", 1), ("status", 1)])
    await app.mongodb.leads.create_index([("phone", 1)], unique=True)
    await app.mongodb.activities.create_index([("lead_id", 1), ("created_at", -1)])
    await app.mongodb.follow_ups.create_index([("assigned_to", 1), ("due_at", 1)])
    await app.mongodb.follow_ups.create_index([("status", 1), ("due_at", 1)])

    yield
    app.mongodb_client.close()


app = FastAPI(title="AI-Assisted Lead Management CRM", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(leads.router, prefix="/api/leads", tags=["leads"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(followups.router, prefix="/api/followups", tags=["follow-ups"])
