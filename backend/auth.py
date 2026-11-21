import os
import warnings
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

# ---- SECRET KEY from environment ----
SECRET_KEY = os.environ.get("NETRA_SECRET_KEY")
if not SECRET_KEY:
    warnings.warn(
        "NETRA_SECRET_KEY not set! Using DEV fallback. "
        "Set it before production: set NETRA_SECRET_KEY=your-64-char-random-string"
    )
    SECRET_KEY = "dev-only-insecure-secret-do-not-use-in-production-1234567890abcdef"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived for security


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None