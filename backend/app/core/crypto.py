import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet_key() -> bytes:
    """Derive a valid 32-byte urlsafe base64 Fernet key from SECRET_KEY."""
    secret = getattr(settings, "SECRET_KEY", "orbx-secret-key-fallback")
    key_bytes = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_token(plain_text: Optional[str]) -> Optional[str]:
    """Encrypt plain text token to Fernet ciphertext string."""
    if not plain_text:
        return None
    try:
        f = Fernet(_get_fernet_key())
        return f.encrypt(plain_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return plain_text


def decrypt_token(cipher_text: Optional[str]) -> Optional[str]:
    """Decrypt Fernet ciphertext string to plain text token."""
    if not cipher_text:
        return None
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        # Fallback if token was stored as plain text or cannot be decrypted
        return cipher_text
