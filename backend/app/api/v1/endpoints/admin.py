from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, BackgroundTasks, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import deps
from app.schemas.admin import (
    CompanyCreate, CompanyOut, CompanyUpdate,
    RoleOut, RoleCreate, RoleUpdate, SmtpTestRequest
)
from app.schemas.auth import UserOut, UserCreate, UserUpdate
from app.services.admin_service import AdminService

router = APIRouter()


# ==========================================
# COMPANY ENDPOINTS
# ==========================================
@router.get("/companies", response_model=List[CompanyOut])
async def list_companies(
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "view"))
):
    """List all companies."""
    return await AdminService.list_companies(db)


@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "create"))
):
    """Create a new company."""
    return await AdminService.create_company(db, company_data)


@router.get("/companies/{company_id}", response_model=CompanyOut)
async def get_company_by_id(
    company_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "view"))
):
    """Fetch details of a specific company."""
    return await AdminService.get_company(db, company_id)


@router.put("/companies/{company_id}", response_model=CompanyOut)
async def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """Update details of a specific company."""
    return await AdminService.update_company(db, company_id, company_data)


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "delete"))
):
    """Delete a company if it has no associated records."""
    success = await AdminService.delete_company(db, company_id)
    return {"message": "Company deleted successfully.", "success": success}


@router.post("/companies/{company_id}/logo", response_model=CompanyOut)
async def upload_company_logo(
    company_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """Upload a logo image file for a specific company."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    
    import shutil
    import os
    
    extension = os.path.splitext(file.filename)[1]
    filename = f"company_{company_id}_logo{extension}"
    save_dir = "static/logos"
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    logo_url = f"/api/v1/static/logos/{filename}"
    
    company = await AdminService.get_company(db, company_id)
    company.logo = logo_url
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.post("/companies/test-email")
async def test_smtp_configuration(
    test_req: SmtpTestRequest,
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """
    Test the SMTP configuration by sending a simple text email.
    """
    import aiosmtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart()
    msg["From"] = test_req.email_from
    msg["To"] = test_req.recipient_email
    msg["Subject"] = "SMTP Configuration Test — ORBX ERP"
    
    body = (
        "Hello,\n\n"
        "This is a test email from ORBX ERP to verify that your SMTP configuration settings are correct.\n\n"
        "If you received this message, your SMTP settings are working perfectly!\n\n"
        "Regards,\n"
        "ORBX ERP System"
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=test_req.smtp_host,
            port=test_req.smtp_port,
            username=test_req.smtp_user,
            password=test_req.smtp_password,
            start_tls=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"SMTP connection/delivery failed: {exc}"
        )

    return {"message": f"Test email sent successfully to {test_req.recipient_email}"}


# ==========================================
# ROLES ENDPOINTS
# ==========================================
@router.get("/roles", response_model=List[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "view"))
):
    """List all user roles and permissions."""
    return await AdminService.list_roles(db)


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "create"))
):
    """Create a new user role with a permission matrix."""
    return await AdminService.create_role(db, role_data)


@router.put("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: UUID,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """Update a role and its permission checklist."""
    return await AdminService.update_role(db, role_id, role_data)


# ==========================================
# USER MANAGEMENT ENDPOINTS
# ==========================================
@router.get("/users", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "view"))
):
    """List all system user profiles."""
    return await AdminService.list_users(db)


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "create"))
):
    """Create a new user account."""
    return await AdminService.create_user(db, user_data)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """Update a user's details, active status, branch mapping, or password."""
    return await AdminService.update_user(db, user_id, user_data)


# ==========================================
# BACKUP & RESTORE ENDPOINTS
# ==========================================
RESTORE_STATUS = {
    "status": "idle",
    "message": "",
    "error": None
}


def run_restore_in_background(temp_zip: str, temp_extract: str):
    global RESTORE_STATUS
    import shutil
    import zipfile
    import subprocess
    import os
    from app.services.backup_manager import get_db_params, find_pg_tool
    from app.db.session import engine

    print("[BackgroundRestore] Starting recovery job...")
    RESTORE_STATUS["status"] = "running"
    RESTORE_STATUS["message"] = "Extracting recovery bundle..."
    RESTORE_STATUS["error"] = None

    try:
        # Ensure temp_extract is clean before extraction
        if os.path.exists(temp_extract):
            try:
                shutil.rmtree(temp_extract)
            except Exception as re:
                print(f"[BackgroundRestore] Could not remove old temp extract path: {re}")
        os.makedirs(temp_extract, exist_ok=True)

        # 1. Extract the bundle
        with zipfile.ZipFile(temp_zip, 'r') as zipf:
            zipf.extractall(temp_extract)
        print("[BackgroundRestore] Bundle extracted successfully.")
        
        # 2. Restore Database
        sql_file = os.path.join(temp_extract, "database.sql")
        if os.path.exists(sql_file):
            RESTORE_STATUS["message"] = "Wiping existing database public schema..."
            db_params = get_db_params()
            if db_params:
                user, password, host, port, dbname = db_params
                os.environ['PGPASSWORD'] = password
                
                tool_path = find_pg_tool("psql")
                restore_cmd = [
                    tool_path,
                    "-h", str(host),
                    "-p", str(port) if port else "5432",
                    "-U", str(user),
                    "-d", str(dbname),
                    "-f", sql_file
                ]
                
                # Dispose engine pool
                try:
                    engine.sync_engine.dispose()
                    print("[BackgroundRestore] Disposed SQLAlchemy connection pool.")
                except Exception as de:
                    print(f"[BackgroundRestore] Error disposing engine pool: {de}")
                
                # Clear all existing tables by dropping and recreating public schema
                reset_cmd = [
                    tool_path,
                    "-h", str(host),
                    "-p", str(port) if port else "5432",
                    "-U", str(user),
                    "-d", str(dbname),
                    "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{dbname}' AND pid <> pg_backend_pid(); DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
                ]
                print("[BackgroundRestore] Wiping existing public schema before recovery...")
                reset_res = subprocess.run(reset_cmd, capture_output=True, text=True)
                if reset_res.returncode != 0:
                    print(f"[BackgroundRestore] Warning: Schema wipe output: {reset_res.stderr}")
                else:
                    print("[BackgroundRestore] Database schema successfully wiped.")
                
                RESTORE_STATUS["message"] = "Importing snapshot database tables..."
                print("[BackgroundRestore] Executing psql restore process...")
                result = subprocess.run(restore_cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"[BackgroundRestore] psql error output: {result.stderr}")
                    RESTORE_STATUS["status"] = "failed"
                    RESTORE_STATUS["error"] = result.stderr
                    RESTORE_STATUS["message"] = "PSQL recovery execution failed."
                    return
                else:
                    print("[BackgroundRestore] Database restore completed successfully.")
            else:
                print("[BackgroundRestore] Database configuration details could not be parsed.")
                RESTORE_STATUS["status"] = "failed"
                RESTORE_STATUS["message"] = "Failed to parse database connection parameters."
                return
        
        # 3. Restore .env
        RESTORE_STATUS["message"] = "Restoring environment configuration files..."
        env_backup_path = os.path.join(temp_extract, ".env")
        if os.path.exists(env_backup_path):
            target_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")
            try:
                shutil.copy(env_backup_path, target_env)
                print("[BackgroundRestore] .env environment variables restored.")
            except Exception as ee:
                print(f"[BackgroundRestore] Could not copy .env file: {ee}")
                
        print("[BackgroundRestore] System recovery completed successfully.")
        RESTORE_STATUS["status"] = "completed"
        RESTORE_STATUS["message"] = "System database and environment restored successfully."
        
    except Exception as e:
        import traceback
        print(f"[BackgroundRestore] CRITICAL RECOVERY FAILURE:\n{traceback.format_exc()}")
        RESTORE_STATUS["status"] = "failed"
        RESTORE_STATUS["error"] = str(e)
        RESTORE_STATUS["message"] = "System restore crashed during background execution."
    finally:
        try:
            if os.path.exists(temp_zip): os.remove(temp_zip)
        except Exception: pass
        try:
            if os.path.exists(temp_extract): shutil.rmtree(temp_extract)
        except Exception: pass
        print("[BackgroundRestore] Background cleanup done.")


@router.get("/backups")
def get_backups(current_user = Depends(deps.PermissionChecker("admin", "view"))):
    """Retrieve lists of database backup files."""
    from app.services.backup_manager import list_backups
    return list_backups()


@router.post("/backups/generate")
def generate_backup(current_user = Depends(deps.PermissionChecker("admin", "edit"))):
    """Manually generate a snapshot ZIP archive of the PostgreSQL database."""
    from app.services.backup_manager import create_backup, delete_old_backups
    try:
        name, err = create_backup()
        if err:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=err)
        delete_old_backups()
        return {"message": "Backup created successfully", "filename": name}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to generate backup: {str(e)}")


@router.get("/backups/{filename}/download")
def download_backup(filename: str, current_user = Depends(deps.PermissionChecker("admin", "view"))):
    """Download a generated backup snapshot ZIP file."""
    import os
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from app.services.backup_manager import BACKUP_DIR

    path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    return FileResponse(path, filename=filename, media_type='application/zip')


@router.post("/backups/restore")
async def restore_backup(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user = Depends(deps.PermissionChecker("admin", "edit"))
):
    """Upload a backup snapshot ZIP file to restore the database in the background."""
    import os
    import shutil
    from fastapi import HTTPException
    from app.services.backup_manager import ensure_backup_dir, BACKUP_DIR

    ensure_backup_dir()
    temp_zip = os.path.join(BACKUP_DIR, "temp_restore.zip")
    temp_extract = os.path.join(BACKUP_DIR, "temp_extract")
    
    try:
        # Save the uploaded file temporarily (sync copy)
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Spawn the restore execution in the background
        background_tasks.add_task(run_restore_in_background, temp_zip, temp_extract)
        
        return {"message": "Restore started successfully in the background. Systems and files are being recovered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate restore: {str(e)}")


@router.get("/backups/restore/status")
def get_restore_status(current_user = Depends(deps.PermissionChecker("admin", "view"))):
    """Retrieve current background system restoration status."""
    return RESTORE_STATUS

