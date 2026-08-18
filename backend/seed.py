import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_owner():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    # Prevent duplicate seeding
    existing_user = await db.users.find_one({"email": "owner@example.com"})
    if existing_user:
        print("Owner account already exists.")
        client.close()
        return

    owner = {
        "email": "owner@example.com",
        "hashed_password": pwd_context.hash("Admin123!"),
        "role": "owner",
        "is_active": True,
    }

    # Insert seed owner account[cite: 1]
    await db.users.insert_one(owner)
    print("Database seeded successfully with owner account.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_owner())


# python seed_db.py
