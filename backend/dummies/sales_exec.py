import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash


async def seed_sales_exec():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]

    existing_user = await db.users.find_one({"email": "sales_exec@example.com"})
    if existing_user:
        print("sales_exec account already exists.")
        client.close()
        return

    sales_exec = {
        "email": "sales_exec@example.com",
        "hashed_password": get_password_hash("Exec123!"),
        "role": "sales_executive",
        "is_active": True,
    }

    await db.users.insert_one(sales_exec)
    print("Database seeded successfully with sales_exec account.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_sales_exec())
