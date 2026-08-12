from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import SessionLocal
from app.services.account_services import AccountServices

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all financial year sequences exist on startup
    async with SessionLocal() as db:
        await AccountServices.ensure_fy_sequences(db)
        
        # Ensure my_ledger_adjustments table and constraints exist
        from sqlalchemy import text
        try:
            await db.execute(text("""
            CREATE TABLE IF NOT EXISTS my_ledger_adjustments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                party_type VARCHAR(30) NOT NULL,
                party_id UUID NOT NULL,
                tx_key VARCHAR(100) NOT NULL,
                tx_type VARCHAR(50),
                reference_no VARCHAR(100),
                additional_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                notes VARCHAR(255),
                company_id UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_my_ledger_party_tx_key UNIQUE (party_type, party_id, tx_key)
            );
            CREATE INDEX IF NOT EXISTS ix_my_ledger_adjustments_party_type ON my_ledger_adjustments(party_type);
            CREATE INDEX IF NOT EXISTS ix_my_ledger_adjustments_party_id ON my_ledger_adjustments(party_id);
            CREATE INDEX IF NOT EXISTS ix_my_ledger_adjustments_tx_key ON my_ledger_adjustments(tx_key);
            CREATE INDEX IF NOT EXISTS ix_my_ledger_adjustments_company_id ON my_ledger_adjustments(company_id);
            """))
            await db.commit()
        except Exception as e:
            print(f"Error auto-creating my_ledger_adjustments: {e}")
    yield

# Create core FastAPI application instance
from app.db import audit_listener  # noqa

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Corporate Enterprise Resource Planning API Gateway",
    version="1.0.0",
    docs_url="/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Ensure static directories exist and mount static files router
os.makedirs("static/logos", exist_ok=True)
app.mount("/api/v1/static", StaticFiles(directory="static"), name="static")


# Configure Cross-Origin Resource Sharing (CORS)
# Allows our React frontend on different ports or environments to communicate smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from app.core.audit_context import current_ip

@app.middleware("http")
async def audit_context_middleware(request: Request, call_next):
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None
    
    current_ip.set(ip)
    response = await call_next(request)
    return response


# Aggregate modular routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/api/v1/health", tags=["System Status Verification"])
async def health_check():
    """Verify backend system status and database health connection."""
    return {
        "success": True,
        "status": "healthy",
        "timestamp": "2026-06-01T22:30:00+05:30",
        "service": settings.PROJECT_NAME
    }
