import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash


async def seed_owner():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    existing_user = await db.users.find_one({"email": "owner@example.com"})
    if existing_user:
        print("Owner account already exists.")
        client.close()
        return

    owner = {
        "email": "owner@example.com",
        "hashed_password": get_password_hash("Admin123!"),
        "role": "owner",
        "is_active": True,
    }

    await db.users.insert_one(owner)
    print("Database seeded successfully with owner account.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_owner())
