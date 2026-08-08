from contextlib import asynccontextmanager
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.api import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URI)
    app.mongodb = app.mongodb_client[settings.DATABASE_NAME]
    yield
    app.mongodb_client.close()


app = FastAPI(title="AI-Assisted Lead Management CRM", lifespan=lifespan)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
