import asyncio
from sqlalchemy.future import select

from app.db.session import SessionLocal
from app.models.auth import User, Role

async def check():
    db = SessionLocal()
    q = await db.execute(select(User))
    users = q.scalars().all()
    print("--- SYSTEM USERS AND ROLES ---")
    for u in users:
        # Load role
        q_role = await db.execute(select(Role).filter(Role.id == u.role_id))
        role = q_role.scalar_one_or_none()
        role_name = role.name if role else "N/A"
        print(f"User: {u.full_name} | Email: {u.email} | Role: '{role_name}'")
    await db.close()

if __name__ == "__main__":
    asyncio.run(check())
