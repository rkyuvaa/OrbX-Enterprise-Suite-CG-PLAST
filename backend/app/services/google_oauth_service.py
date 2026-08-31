import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, Optional, Tuple
import urllib.parse
import httpx

from app.core.config import settings


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SEND_URL = "https://gmail.googleapis.com/v1/users/me/messages/send"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"


class GoogleOAuthError(Exception):
    def __init__(self, error_type: str, message: str):
        self.error_type = error_type
        self.message = message
        super().__init__(f"[{error_type}] {message}")


def get_google_auth_url(company_id: str, redirect_uri: Optional[str] = None) -> str:
    """Generate Google OAuth 2.0 authorization consent URL."""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise GoogleOAuthError("configuration_missing", "GOOGLE_CLIENT_ID is not configured in backend settings.")

    r_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
    if not r_uri:
        raise GoogleOAuthError("configuration_missing", "GOOGLE_REDIRECT_URI is not configured.")

    params = {
        "client_id": client_id,
        "redirect_uri": r_uri,
        "response_type": "code",
        "scope": GMAIL_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": str(company_id),
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


async def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
    """Exchange authorization code for access and refresh tokens."""
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    r_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

    if not client_id or not client_secret:
        raise GoogleOAuthError("configuration_missing", "Google OAuth Client ID or Client Secret is missing.")

    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": r_uri,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=payload)
        data = response.json()

        if response.status_code != 200:
            error_desc = data.get("error_description") or data.get("error") or "Failed to exchange authorization code."
            raise GoogleOAuthError("auth_failure", f"Google OAuth exchange failed: {error_desc}")

        return data


async def get_user_info(access_token: str) -> Dict[str, Any]:
    """Fetch user profile info (email address) using access token."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
        if response.status_code != 200:
            raise GoogleOAuthError("userinfo_failure", "Failed to retrieve user info from Google.")
        return response.json()


async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """Fetch a new access token using stored refresh token."""
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET

    if not client_id or not client_secret:
        raise GoogleOAuthError("configuration_missing", "Google OAuth Client ID or Client Secret is missing.")

    payload = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=payload)
        data = response.json()

        if response.status_code != 200:
            error_desc = data.get("error_description") or data.get("error") or "Token refresh failed."
            if "invalid_grant" in str(data) or "revoked" in str(data):
                raise GoogleOAuthError("token_expired_or_revoked", "Google OAuth Refresh Token is expired or revoked. Please reconnect your Google account.")
            raise GoogleOAuthError("auth_failure", f"Google token refresh error: {error_desc}")

        return data


async def send_email_via_gmail_api(
    access_token: str,
    to_email: str,
    subject: str,
    body: str,
    pdf_bytes: Optional[bytes] = None,
    filename: Optional[str] = "document.pdf",
    from_email: Optional[str] = None
) -> Dict[str, Any]:
    """Send MIME email via Google Gmail REST API users.messages.send."""
    msg = MIMEMultipart()
    if from_email:
        msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    if pdf_bytes:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)

    # Encode MIME to URL-safe base64 string
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            GMAIL_SEND_URL,
            headers=headers,
            json={"raw": raw_message}
        )
        data = response.json()

        if response.status_code == 401:
            raise GoogleOAuthError("token_expired_or_revoked", "Access token expired or unauthorized.")
        elif response.status_code == 403:
            raise GoogleOAuthError("permission_failure", "Permission failure: Insufficient Gmail API permissions to send emails.")
        elif response.status_code != 200:
            error_msg = data.get("error", {}).get("message") or f"Gmail API HTTP {response.status_code}"
            raise GoogleOAuthError("gmail_api_failure", f"Gmail API error: {error_msg}")

        return data
