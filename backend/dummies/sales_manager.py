import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash


async def seed_sales_manager():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    existing_user = await db.users.find_one({"email": "sales_manager@example.com"})
    if existing_user:
        print("sales_manager account already exists.")
        client.close()
        return

    sales_manager = {
        "email": "sales_manager@example.com",
        "hashed_password": get_password_hash("Manager123!"),
        "role": "sales_manager",
        "is_active": True,
    }

    await db.users.insert_one(sales_manager)
    print("Database seeded successfully with sales_manager account.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_sales_manager())
