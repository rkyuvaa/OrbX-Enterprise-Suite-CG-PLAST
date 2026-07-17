from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.models.auth import Role, Permission, User
from app.models.business import Company
from app.schemas.admin import (
    CompanyCreate, CompanyUpdate, RoleCreate, RoleUpdate
)
from app.schemas.auth import UserCreate, UserUpdate


class AdminService:
    # ==========================================
    # COMPANY SERVICES
    # ==========================================
    @staticmethod
    async def get_company(db: AsyncSession, company_id: Optional[UUID] = None) -> Company:
        """Fetch a company by ID, or the first company if no ID is specified, or create a default if empty."""
        if company_id:
            query = await db.execute(select(Company).filter(Company.id == company_id))
            company = query.scalar_one_or_none()
            if not company:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found."
                )
            return company

        query = await db.execute(select(Company))
        company = query.scalars().first()
        if not company:
            # Create a fallback default company
            company = Company(
                name="ORBX Corporation",
                code="HQ",
                logo="",
                address="123 Corporate Blvd, Silicon Valley",
                gstin="22AAAAA0000A1Z5",
                email="info@orbx.com",
                phone="+1-555-0199",
                financial_year_start="2026-04-01"
            )
            db.add(company)
            await db.commit()
            await db.refresh(company)
        return company

    @staticmethod
    async def list_companies(db: AsyncSession) -> List[Company]:
        """Fetch all companies."""
        # Make sure at least one company exists
        await AdminService.get_company(db)
        query = await db.execute(select(Company).order_by(Company.name.asc()))
        return list(query.scalars().all())

    @staticmethod
    async def create_company(db: AsyncSession, company_data: CompanyCreate) -> Company:
        """Create a new company."""
        # Check duplicate name
        query_name = await db.execute(select(Company).filter(Company.name == company_data.name))
        if query_name.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company name '{company_data.name}' already exists."
            )

        # Check duplicate code
        query_code = await db.execute(select(Company).filter(Company.code == company_data.code))
        if query_code.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company code '{company_data.code}' already exists."
            )

        company = Company(**company_data.model_dump())
        db.add(company)
        await db.commit()
        await db.refresh(company)
        return company

    @staticmethod
    async def update_company(db: AsyncSession, company_id: UUID, company_data: CompanyUpdate) -> Company:
        """Update company profile information."""
        query = await db.execute(select(Company).filter(Company.id == company_id))
        company = query.scalar_one_or_none()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found."
            )

        for key, value in company_data.model_dump(exclude_unset=True).items():
            setattr(company, key, value)
        db.add(company)
        await db.commit()
        await db.refresh(company)
        return company

    @staticmethod
    async def delete_company(db: AsyncSession, company_id: UUID) -> bool:
        """Delete a company if it has no associated records/users."""
        query = await db.execute(select(Company).filter(Company.id == company_id))
        company = query.scalar_one_or_none()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found."
            )
        
        # Check if company is the only company
        query_all = await db.execute(select(Company))
        all_companies = query_all.scalars().all()
        if len(all_companies) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only remaining company in the system."
            )

        try:
            await db.delete(company)
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete this company because it has active transaction records. Consider marking it inactive instead."
            )


    # ==========================================
    # ROLES & PERMISSIONS SERVICES
    # ==========================================
    @staticmethod
    async def list_roles(db: AsyncSession) -> List[Role]:
        """Fetch all roles including their permission checklists."""
        query = await db.execute(select(Role).options(selectinload(Role.permissions)).order_by(Role.created_at.desc()))
        return list(query.scalars().all())

    @staticmethod
    async def create_role(db: AsyncSession, role_data: RoleCreate) -> Role:
        """Create a new role and seed its permission matrix."""
        query_check = await db.execute(select(Role).filter(Role.name == role_data.name))
        if query_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{role_data.name}' already exists."
            )

        role = Role(
            name=role_data.name,
            description=role_data.description
        )
        db.add(role)
        await db.commit()
        await db.refresh(role)

        # Seed permissions if provided
        if role_data.permissions:
            for perm in role_data.permissions:
                db_perm = Permission(
                    role_id=role.id,
                    module=perm.module,
                    action=perm.action,
                    is_allowed=perm.is_allowed
                )
                db.add(db_perm)
            await db.commit()

        # Re-fetch role with seeded permissions
        query_final = await db.execute(
            select(Role)
            .filter(Role.id == role.id)
            .options(selectinload(Role.permissions))
        )
        return query_final.scalar_one()

    @staticmethod
    async def update_role(db: AsyncSession, role_id: UUID, role_data: RoleUpdate) -> Role:
        """Update role description and rewrite/modify its permission matrix."""
        query = await db.execute(select(Role).filter(Role.id == role_id))
        role = query.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found."
            )

        if role_data.name:
            role.name = role_data.name
        if role_data.description:
            role.description = role_data.description
        db.add(role)

        # Update permissions
        if role_data.permissions is not None:
            # Let's perform a drop & write for this role's permissions
            # to make permissions update simple and atomic.
            query_old = await db.execute(select(Permission).filter(Permission.role_id == role.id))
            for p in query_old.scalars().all():
                await db.delete(p)
            
            for perm in role_data.permissions:
                db_perm = Permission(
                    role_id=role.id,
                    module=perm.module,
                    action=perm.action,
                    is_allowed=perm.is_allowed
                )
                db.add(db_perm)
        
        await db.commit()
        
        query_final = await db.execute(
            select(Role)
            .filter(Role.id == role.id)
            .options(selectinload(Role.permissions))
        )
        return query_final.scalar_one()

    # ==========================================
    # USER MANAGEMENT SERVICES
    # ==========================================
    @staticmethod
    async def list_users(db: AsyncSession) -> List[User]:
        """List all users with roles and companies loaded."""
        query = await db.execute(
            select(User)
            .options(selectinload(User.role), selectinload(User.companies))
            .order_by(User.created_at.desc())
        )
        return list(query.scalars().all())

    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Create a user with a hashed password and link to companies."""
        query_check = await db.execute(select(User).filter(User.email == user_data.email))
        if query_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User email '{user_data.email}' already registered."
            )

        # Verify role exists
        query_role = await db.execute(select(Role).filter(Role.id == user_data.role_id))
        if not query_role.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned role does not exist."
            )

        # Verify and fetch companies
        companies = []
        if user_data.company_ids:
            query_companies = await db.execute(select(Company).filter(Company.id.in_(user_data.company_ids)))
            companies = list(query_companies.scalars().all())
            if len(companies) != len(user_data.company_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more assigned companies do not exist."
                )

        user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role_id=user_data.role_id,
            companies=companies
        )
        db.add(user)
        await db.commit()
        
        # Re-fetch user with loaded companies and role
        query_final = await db.execute(
            select(User)
            .filter(User.id == user.id)
            .options(selectinload(User.role), selectinload(User.companies))
        )
        return query_final.scalar_one()

    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, user_data: UserUpdate) -> User:
        """Update user details and assigned companies."""
        query = await db.execute(
            select(User)
            .filter(User.id == user_id)
            .options(selectinload(User.companies))
        )
        user = query.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        data = user_data.model_dump(exclude_unset=True)
        if "password" in data and data["password"]:
            user.hashed_password = get_password_hash(data.pop("password"))
        
        if "company_ids" in data:
            company_ids = data.pop("company_ids")
            if company_ids is not None:
                query_companies = await db.execute(select(Company).filter(Company.id.in_(company_ids)))
                companies = list(query_companies.scalars().all())
                if len(companies) != len(company_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="One or more assigned companies do not exist."
                    )
                user.companies = companies

        for key, value in data.items():
            setattr(user, key, value)

        db.add(user)
        await db.commit()
        
        # Re-fetch user
        query_final = await db.execute(
            select(User)
            .filter(User.id == user.id)
            .options(selectinload(User.role), selectinload(User.companies))
        )
        return query_final.scalar_one()
