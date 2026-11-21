import os
import io
import re
import base64
import warnings
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import networkx as nx

try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
    warnings.warn("python-magic not installed. MIME validation disabled.")

from validators import validate_entity, VALIDATORS
from database import get_db, init_db, log_action
from auth import hash_password, verify_password, create_token, decode_token
from extraction import extract_entities, extract_relationships, ENTITY_CATEGORIES
from integrity import sha256_of_bytes, verify_integrity
from permissions import (
    require_role, require_level, can_view_case, can_manage_role,
    clearance_value, ROLE_LEVEL,
)
from patterns import detect_alerts


# ============ APP SETUP ============
app = FastAPI(title="NETRA API", docs_url=None, redoc_url=None)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "connect-src *; "
            "frame-ancestors 'none'"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ============ CORS Configuration ============
# Add your frontend URLs here. Default is localhost for development.
# For production, add your actual domain (e.g., "https://netra.yourdomain.com")
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


ALLOWED_EXTENSIONS = {".txt", ".pdf", ".csv", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {
    "text/plain", "application/pdf", "text/csv",
    "application/csv", "application/vnd.ms-excel",
    "image/jpeg", "image/png",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(400, "Password must contain an uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(400, "Password must contain a lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(400, "Password must contain a digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-]", password):
        raise HTTPException(400, "Password must contain a special character")


def sanitize_filename(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r"[^\w\.\-]", "_", name)
    return name[:200] or "unnamed"


# ============ STARTUP ============
@app.on_event("startup")
def startup():
    init_db()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as n FROM officers")
    if c.fetchone()["n"] == 0:
        seed = [
            ("admin1", "Admin@12345", "Admin Vikram Singh", "SystemAdmin", "HQ", "HQ", "SECRET"),
            ("sp1", "Sp@12345678", "SP Anjali Mehta", "RegionalAdmin", "North", "North HQ", "SECRET"),
            ("sho1", "Sho@12345678", "SHO Priya Sharma", "SHO", "Delhi", "Delhi Central", "SECRET"),
            ("sho2", "Sho@12345678", "SHO Ravi Verma", "SHO", "Delhi", "Delhi East", "CONFIDENTIAL"),
            ("investigator1", "Inv@12345678", "Inspector Rajesh Kumar", "Investigator", "Delhi", "Delhi Central", "CONFIDENTIAL"),
            ("investigator2", "Inv@12345678", "SI Neha Gupta", "Investigator", "Delhi", "Delhi East", "RESTRICTED"),
        ]
        for u, p, n, r, j, st, cl in seed:
            c.execute(
                """INSERT INTO officers 
                   (username, password_hash, full_name, rank, jurisdiction, station, clearance, is_active, created_at)
                   VALUES (?,?,?,?,?,?,?,1,?)""",
                (u, hash_password(p), n, r, j, st, cl, datetime.utcnow().isoformat())
            )
        conn.commit()
    conn.close()


# ============ AUTH DEPENDENCY ============
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT is_active FROM officers WHERE id=?", (payload.get("id"),))
    row = c.fetchone()
    conn.close()
    if not row or not row["is_active"]:
        raise HTTPException(401, "Account deactivated")
    return payload


# ============ LOGIN ============
@app.post("/api/login")
@limiter.limit("5/minute")
def login(request: Request, body: dict):
    username = (body.get("username") or "").strip()[:64]
    password = body.get("password") or ""

    if not username or not password:
        raise HTTPException(400, "Username and password required")

    ip = request.client.host if request.client else "unknown"

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM officers WHERE username=?", (username,))
    row = c.fetchone()

    if not row:
        log_action(0, username, "LOGIN_FAILED", f"User not found from IP {ip}", ip=ip, rank="UNKNOWN")
        conn.close()
        hash_password("dummy-password-do-not-match")
        raise HTTPException(401, "Invalid credentials")

    if row["locked_until"]:
        try:
            locked = datetime.fromisoformat(row["locked_until"])
            if locked > datetime.utcnow():
                conn.close()
                log_action(row["id"], username, "LOGIN_LOCKED", "Attempt during lockout", ip=ip, rank=row["rank"])
                raise HTTPException(403, "Account locked. Try after 15 minutes.")
        except (ValueError, TypeError):
            pass

    if not row["is_active"]:
        conn.close()
        raise HTTPException(403, "Account deactivated")

    if not verify_password(password, row["password_hash"]):
        attempts = (row["failed_attempts"] or 0) + 1
        locked_until = None
        if attempts >= 5:
            locked_until = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
            log_action(row["id"], username, "ACCOUNT_LOCKED", "5 failed attempts, locked 15 min", ip=ip, rank=row["rank"])
        c.execute("UPDATE officers SET failed_attempts=?, locked_until=? WHERE id=?",
                  (attempts, locked_until, row["id"]))
        conn.commit()
        conn.close()
        log_action(row["id"], username, "LOGIN_FAILED", f"Wrong password, attempt {attempts}", ip=ip, rank=row["rank"])
        raise HTTPException(401, "Invalid credentials")

    c.execute("UPDATE officers SET failed_attempts=0, locked_until=NULL WHERE id=?", (row["id"],))
    conn.commit()
    conn.close()

    token = create_token({
        "sub": row["username"],
        "id": row["id"],
        "rank": row["rank"],
        "jurisdiction": row["jurisdiction"],
        "station": row["station"] or "",
        "clearance": row["clearance"],
        "full_name": row["full_name"],
    })
    log_action(row["id"], row["username"], "LOGIN", "Success", ip=ip, rank=row["rank"])
    return {"token": token, "user": {
        "id": row["id"],
        "username": row["username"],
        "full_name": row["full_name"],
        "rank": row["rank"],
        "jurisdiction": row["jurisdiction"],
        "station": row["station"] or "",
        "clearance": row["clearance"],
    }}


@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return user


# ============ CASE ACCESS HELPER ============
def _check_case_access(case_id: int, user: dict, conn, require_open: bool = False) -> dict:
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id=?", (case_id,))
    case = c.fetchone()
    if not case:
        raise HTTPException(404, "Case not found")
    if not can_view_case(user, dict(case)):
        raise HTTPException(403, "Access denied to this case")

    case = dict(case)
    if require_open and case.get("status") in ("CLOSED", "CONVICTED", "ACQUITTED", "DISCHARGED"):
        raise HTTPException(400,
            f"Case is {case['status']}. Court order finalized. "
            "Case is read-only. Reopen requires court directive.")
    return case


# ==================================================================
#                     OFFICER MANAGEMENT
# ==================================================================

@app.get("/api/officers")
def list_officers(user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 2)

    conn = get_db()
    c = conn.cursor()

    if rank == "SystemAdmin":
        c.execute("""SELECT id, username, full_name, rank, jurisdiction, station,
                            clearance, is_active, created_at FROM officers ORDER BY id""")
    elif rank == "RegionalAdmin":
        c.execute("""SELECT id, username, full_name, rank, jurisdiction, station,
                            clearance, is_active, created_at FROM officers
                     WHERE jurisdiction=? OR ?='North'
                     ORDER BY id""",
                  (user["jurisdiction"], user["jurisdiction"]))
    elif rank == "SHO":
        c.execute("""SELECT id, username, full_name, rank, jurisdiction, station,
                            clearance, is_active, created_at FROM officers
                     WHERE station=? AND rank='Investigator'
                     ORDER BY id""",
                  (user.get("station"),))
    else:
        conn.close()
        raise HTTPException(403, "Access denied")

    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@app.post("/api/officers")
@limiter.limit("10/minute")
def create_officer(request: Request, body: dict, user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 2)

    target_rank = body.get("rank", "Investigator")

    if not can_manage_role(user, target_rank):
        raise HTTPException(403, f"You cannot create a {target_rank}")

    required = ["username", "password", "full_name", "jurisdiction"]
    for r in required:
        if not body.get(r):
            raise HTTPException(400, f"{r} is required")

    username = body["username"].strip()
    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", username):
        raise HTTPException(400, "Username must be 3-30 chars, alphanumeric + underscore")

    validate_password_strength(body["password"])

    if rank == "SHO":
        if body["jurisdiction"] != user["jurisdiction"]:
            raise HTTPException(403, "You can only add officers in your jurisdiction")
        if body.get("station", "") != user.get("station"):
            raise HTTPException(403, "You can only add officers in your station")

    if rank == "RegionalAdmin" and user["jurisdiction"] != "North":
        if body["jurisdiction"] != user["jurisdiction"]:
            raise HTTPException(403, "You can only add officers in your jurisdiction")

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id FROM officers WHERE username=?", (username,))
    if c.fetchone():
        conn.close()
        raise HTTPException(400, "Username already exists")

    try:
        c.execute("""
            INSERT INTO officers
            (username, password_hash, full_name, rank, jurisdiction, station,
             clearance, is_active, created_by, created_at)
            VALUES (?,?,?,?,?,?,?,1,?,?)
        """, (
            username,
            hash_password(body["password"]),
            body["full_name"].strip()[:100],
            target_rank,
            body["jurisdiction"][:50],
            body.get("station", "")[:50],
            body.get("clearance", "RESTRICTED"),
            user["id"],
            datetime.utcnow().isoformat(),
        ))
        conn.commit()
        oid = c.lastrowid
    except Exception:
        conn.close()
        raise HTTPException(400, "Could not create officer")
    conn.close()

    log_action(user["id"], user["sub"], "CREATE_OFFICER",
               f"{target_rank} {username}", rank=rank)
    return {"id": oid, "message": "Officer created"}


@app.put("/api/officers/{officer_id}")
def update_officer(officer_id: int, body: dict, user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 2)

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM officers WHERE id=?", (officer_id,))
    target = c.fetchone()
    if not target:
        conn.close()
        raise HTTPException(404, "Officer not found")

    if not can_manage_role(user, target["rank"]):
        conn.close()
        raise HTTPException(403, f"You cannot modify a {target['rank']}")

    if rank == "SHO":
        if target["rank"] != "Investigator":
            conn.close()
            raise HTTPException(403, "SHO can only modify Investigators")
        if target["station"] != user.get("station"):
            conn.close()
            raise HTTPException(403, "SHO can only modify officers in own station")

    if rank == "SHO":
        allowed_fields = ["full_name"]
    else:
        allowed_fields = ["full_name", "clearance", "station", "is_active"]

    if target["id"] == user["id"]:
        if "is_active" in body and not body["is_active"]:
            conn.close()
            raise HTTPException(400, "You cannot deactivate yourself")
        if "clearance" in body:
            conn.close()
            raise HTTPException(400, "You cannot change your own clearance")

    valid_clearances = {"RESTRICTED", "CONFIDENTIAL", "SECRET"}

    fields = []
    values = []
    skipped = []
    for k in body.keys():
        if k in ("id", "username", "password", "password_hash", "rank", "jurisdiction"):
            continue
        if k not in allowed_fields:
            skipped.append(k)
            continue
        v = body[k]
        if k == "clearance" and v not in valid_clearances:
            continue
        if k == "full_name":
            v = str(v).strip()[:100]
        if k == "station":
            v = str(v).strip()[:50]
        if k == "is_active":
            v = 1 if v else 0
        fields.append(f"{k}=?")
        values.append(v)

    if not fields:
        conn.close()
        if skipped:
            raise HTTPException(403, f"Your role ({rank}) cannot modify: {', '.join(skipped)}")
        raise HTTPException(400, "Nothing to update")

    values.append(officer_id)
    c.execute(f"UPDATE officers SET {', '.join(fields)} WHERE id=?", values)
    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "UPDATE_OFFICER",
               f"officer_id={officer_id}", rank=rank)
    return {"message": "Officer updated", "skipped": skipped}


@app.post("/api/officers/{officer_id}/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, officer_id: int, body: dict, user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 2)

    new_password = body.get("password")
    if not new_password:
        raise HTTPException(400, "Password required")
    validate_password_strength(new_password)

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM officers WHERE id=?", (officer_id,))
    target = c.fetchone()
    if not target:
        conn.close()
        raise HTTPException(404, "Officer not found")

    if not can_manage_role(user, target["rank"]):
        conn.close()
        raise HTTPException(403, "Access denied")

    if rank == "SHO":
        if target["rank"] != "Investigator" or target["station"] != user.get("station"):
            conn.close()
            raise HTTPException(403, "SHO can only reset passwords for own Investigators")

    c.execute("UPDATE officers SET password_hash=?, failed_attempts=0, locked_until=NULL WHERE id=?",
              (hash_password(new_password), officer_id))
    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "RESET_PASSWORD",
               f"officer_id={officer_id}", rank=rank)
    return {"message": "Password reset"}


@app.delete("/api/officers/{officer_id}")
def delete_officer(officer_id: int, user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 3)

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM officers WHERE id=?", (officer_id,))
    target = c.fetchone()
    if not target:
        conn.close()
        raise HTTPException(404, "Officer not found")

    if not can_manage_role(user, target["rank"]):
        conn.close()
        raise HTTPException(403, "Access denied")

    if target["id"] == user["id"]:
        conn.close()
        raise HTTPException(400, "You cannot delete yourself")

    c.execute("UPDATE officers SET is_active=0 WHERE id=?", (officer_id,))
    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "DELETE_OFFICER", f"{target['username']}", rank=rank)
    return {"message": "Officer deactivated"}


# ==================================================================
#                          CASES
# ==================================================================

@app.get("/api/cases")
def list_cases(user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        return []

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM cases ORDER BY id DESC")
    all_cases = [dict(r) for r in c.fetchall()]
    conn.close()

    return [c for c in all_cases if can_view_case(user, c)]


@app.post("/api/cases")
@limiter.limit("20/minute")
def create_case(request: Request, body: dict, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "SystemAdmin cannot create cases")

    code = (body.get("case_code") or "").strip()[:50]
    title = (body.get("title") or "").strip()[:200]
    if not code or not title:
        raise HTTPException(400, "case_code and title required")

    if not re.match(r"^[A-Za-z0-9\-_/]{2,50}$", code):
        raise HTTPException(400, "Invalid case_code format")

    sensitivity = body.get("sensitivity", "RESTRICTED")
    if sensitivity not in {"RESTRICTED", "CONFIDENTIAL", "SECRET"}:
        raise HTTPException(400, "Invalid sensitivity")

    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO cases
            (case_code, title, sensitivity, jurisdiction, station, status,
             assigned_to, created_by, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            code, title, sensitivity,
            body.get("jurisdiction", user["jurisdiction"])[:50],
            body.get("station", user.get("station", ""))[:50],
            "OPEN",
            None,
            user["id"],
            datetime.utcnow().isoformat(),
        ))
        conn.commit()
        cid = c.lastrowid
    except Exception:
        conn.close()
        raise HTTPException(400, "Case code already exists or invalid data")
    conn.close()

    log_action(user["id"], user["sub"], "CREATE_CASE", code, rank=user["rank"])
    return {"id": cid, "message": "Case created"}


@app.post("/api/cases/{case_id}/assign")
def assign_case(case_id: int, body: dict, user=Depends(get_current_user)):
    require_level(user, 2)

    officer_id = body.get("officer_id")
    if not officer_id:
        raise HTTPException(400, "officer_id required")

    conn = get_db()
    if user["rank"] != "SystemAdmin":
        _check_case_access(case_id, user, conn)

    c = conn.cursor()
    c.execute("SELECT * FROM officers WHERE id=?", (officer_id,))
    officer = c.fetchone()
    if not officer:
        conn.close()
        raise HTTPException(404, "Officer not found")

    if officer["rank"] != "Investigator":
        conn.close()
        raise HTTPException(400, "Can only assign to Investigators")

    if user["rank"] == "SHO" and officer["station"] != user.get("station"):
        conn.close()
        raise HTTPException(403, "Can only assign to officers in your station")

    c.execute("UPDATE cases SET assigned_to=? WHERE id=?", (officer_id, case_id))
    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "ASSIGN_CASE",
               f"case={case_id} to officer={officer_id}", rank=user["rank"])
    return {"message": "Case assigned"}


@app.put("/api/cases/{case_id}/status")
def update_case_status(case_id: int, body: dict, user=Depends(get_current_user)):
    require_level(user, 2)
    status = body.get("status")
    allowed = {"OPEN", "UNDER_INVESTIGATION", "CHARGE_SHEET_FILED", "IN_COURT"}

    if status not in allowed:
        raise HTTPException(400,
            f"Manual status change only for: {sorted(allowed)}. "
            "Final status comes only via court order.")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("UPDATE cases SET status=? WHERE id=?", (status, case_id))
    conn.commit()
    conn.close()
    log_action(user["id"], user["sub"], "UPDATE_CASE_STATUS",
               f"case={case_id} status={status}", rank=user["rank"])
    return {"message": "Status updated"}


# ==================================================================
#                     EVIDENCE
# ==================================================================

@app.post("/api/cases/{case_id}/upload")
@limiter.limit("20/minute")
async def upload_evidence(request: Request, case_id: int, file: UploadFile = File(...), user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "SystemAdmin cannot access case data")

    conn = get_db()
    _check_case_access(case_id, user, conn, require_open=True)

    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        conn.close()
        raise HTTPException(400, f"File too large. Max {MAX_FILE_SIZE // (1024*1024)} MB")

    if len(data) == 0:
        conn.close()
        raise HTTPException(400, "Empty file")

    safe_name = sanitize_filename(file.filename or "unnamed")
    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        conn.close()
        raise HTTPException(400, f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    if HAS_MAGIC:
        try:
            mime = magic.from_buffer(data, mime=True)
            if mime not in ALLOWED_MIME_TYPES:
                conn.close()
                raise HTTPException(400, f"File content type '{mime}' not allowed")
        except HTTPException:
            raise
        except Exception:
            pass

    file_hash = sha256_of_bytes(data)

    text = ""
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception:
            text = ""
    elif ext in {".txt", ".csv"}:
        try:
            text = data.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    c = conn.cursor()
    c.execute("""
        INSERT INTO evidence (case_id, filename, sha256, uploaded_by, uploaded_at, raw_text)
        VALUES (?,?,?,?,?,?)
    """, (case_id, safe_name, file_hash, user["id"], datetime.utcnow().isoformat(), text))
    eid = c.lastrowid

    entities = extract_entities(text)
    for etype, vals in entities.items():
        for v in vals:
            try:
                c.execute("""
                    INSERT OR IGNORE INTO entities (case_id, type, value, evidence_id)
                    VALUES (?,?,?,?)
                """, (case_id, etype, v, eid))
            except Exception:
                pass

    rels = extract_relationships(text, entities)
    for r in rels:
        c.execute("""
            INSERT INTO relationships
            (case_id, source_type, source_value, target_type, target_value, relation, evidence_id)
            VALUES (?,?,?,?,?,?,?)
        """, (case_id, r["source_type"], r["source_value"],
              r["target_type"], r["target_value"], r["relation"], eid))

    conn.commit()
    conn.close()

    ip = request.client.host if request.client else ""
    log_action(user["id"], user["sub"], "UPLOAD_EVIDENCE",
               f"{safe_name} to case {case_id}", ip=ip, rank=user["rank"])
    return {
        "evidence_id": eid,
        "filename": safe_name,
        "sha256": file_hash,
        "entities_extracted": {k: len(v) for k, v in entities.items()},
        "relationships_found": len(rels),
    }


@app.get("/api/cases/{case_id}/evidence")
def list_evidence(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No access")
    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("SELECT id, filename, sha256, uploaded_at FROM evidence WHERE case_id=?", (case_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@app.post("/api/evidence/{evidence_id}/verify")
async def verify_evidence(evidence_id: int, file: UploadFile = File(...), user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No access")
    data = await file.read()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT sha256, filename, case_id FROM evidence WHERE id=?", (evidence_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Evidence not found")
    _check_case_access(row["case_id"], user, conn)
    conn.close()
    ok = verify_integrity(data, row["sha256"])
    return {
        "verified": ok,
        "original_hash": row["sha256"],
        "current_hash": sha256_of_bytes(data),
        "status": "✓ INTEGRITY VERIFIED" if ok else "⚠ TAMPER DETECTED"
    }


# ==================================================================
#                     BULK CSV IMPORT
# ==================================================================

@app.post("/api/cases/{case_id}/bulk-import")
@limiter.limit("10/minute")
async def bulk_import(request: Request, case_id: int, file: UploadFile = File(...), user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No access")

    conn = get_db()
    _check_case_access(case_id, user, conn, require_open=True)

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        conn.close()
        raise HTTPException(400, "File too large")

    try:
        text = data.decode("utf-8", errors="ignore")
    except Exception:
        conn.close()
        raise HTTPException(400, "Could not read CSV")

    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) < 2:
        conn.close()
        raise HTTPException(400, "CSV too short (need header + 1 row)")
    if len(lines) > 10000:
        conn.close()
        raise HTTPException(400, "CSV too large (max 10000 rows)")

    header = [h.strip().lower() for h in lines[0].split(",")]
    added_entities = 0
    added_relations = 0
    errors = []

    c = conn.cursor()
    for idx, line in enumerate(lines[1:], start=2):
        parts = [p.strip() for p in line.split(",")]
        row = dict(zip(header, parts))

        etype = row.get("type", "").strip()[:40]
        eval_ = row.get("value", "").strip()[:200]

        if not etype or not eval_:
            errors.append(f"Line {idx}: missing type/value")
            continue

        ok, err = validate_entity(etype, eval_)
        if not ok:
            errors.append(f"Line {idx}: {err}")
            continue

        try:
            c.execute("INSERT OR IGNORE INTO entities (case_id, type, value, evidence_id) VALUES (?,?,?,?)",
                      (case_id, etype, eval_, None))
            added_entities += 1
        except Exception:
            errors.append(f"Line {idx}: insert failed")

        rt = row.get("target_type", "").strip()[:40]
        rv = row.get("target_value", "").strip()[:200]
        rel = row.get("relation", "associated_with").strip()[:40] or "associated_with"
        if rt and rv:
            ok2, err2 = validate_entity(rt, rv)
            if ok2:
                c.execute("INSERT OR IGNORE INTO entities (case_id, type, value, evidence_id) VALUES (?,?,?,?)",
                          (case_id, rt, rv, None))
                c.execute("""INSERT INTO relationships
                             (case_id, source_type, source_value, target_type, target_value, relation, evidence_id, weight)
                             VALUES (?,?,?,?,?,?,?,1)""",
                          (case_id, etype, eval_, rt, rv, rel, None))
                added_relations += 1
            else:
                errors.append(f"Line {idx}: target {err2}")

    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "BULK_IMPORT",
               f"case={case_id} entities={added_entities} rels={added_relations}",
               rank=user["rank"])
    return {
        "message": "Bulk import complete",
        "entities_added": added_entities,
        "relationships_added": added_relations,
        "errors": errors[:20],
    }


# ==================================================================
#                     GRAPH / ANALYTICS / ALERTS
# ==================================================================

@app.get("/api/cases/{case_id}/graph")
def get_graph(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()

    c.execute("SELECT * FROM entities WHERE case_id=?", (case_id,))
    entities = [dict(r) for r in c.fetchall()]
    c.execute("SELECT * FROM relationships WHERE case_id=?", (case_id,))
    rels = [dict(r) for r in c.fetchall()]
    conn.close()

    nodes = [{"id": f"{e['type']}:{e['value']}", "label": e["value"], "type": e["type"]}
             for e in entities]
    edges = [{"source": f"{r['source_type']}:{r['source_value']}",
              "target": f"{r['target_type']}:{r['target_value']}",
              "label": r["relation"], "evidence_id": r["evidence_id"]}
             for r in rels]
    return {"nodes": nodes, "edges": edges}


@app.get("/api/cases/{case_id}/analytics")
def analytics(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("SELECT * FROM entities WHERE case_id=?", (case_id,))
    entities = [dict(r) for r in c.fetchall()]
    c.execute("SELECT * FROM relationships WHERE case_id=?", (case_id,))
    rels = [dict(r) for r in c.fetchall()]
    conn.close()

    G = nx.Graph()
    for e in entities:
        G.add_node(f"{e['type']}:{e['value']}", type=e["type"])
    for r in rels:
        s = f"{r['source_type']}:{r['source_value']}"
        t = f"{r['target_type']}:{r['target_value']}"
        if G.has_edge(s, t):
            G[s][t]["weight"] += 1
        else:
            G.add_edge(s, t, weight=1)

    if G.number_of_nodes() == 0:
        return {"degree": [], "betweenness": [], "communities": []}

    degree = sorted(nx.degree_centrality(G).items(), key=lambda x: -x[1])[:10]
    betweenness = sorted(nx.betweenness_centrality(G).items(), key=lambda x: -x[1])[:10]

    try:
        communities = [sorted(list(c)) for c in nx.community.greedy_modularity_communities(G)]
    except Exception:
        communities = []

    return {
        "degree": [{"node": n, "score": round(s, 3)} for n, s in degree],
        "betweenness": [{"node": n, "score": round(s, 3)} for n, s in betweenness],
        "communities": communities,
    }


@app.get("/api/cases/{case_id}/alerts")
def get_alerts(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("SELECT * FROM entities WHERE case_id=?", (case_id,))
    entities = [dict(r) for r in c.fetchall()]
    c.execute("SELECT * FROM relationships WHERE case_id=?", (case_id,))
    rels = [dict(r) for r in c.fetchall()]
    conn.close()

    alerts = detect_alerts(case_id, entities, rels)
    return {"alerts": alerts, "total": len(alerts)}


@app.get("/api/cases/{case_id}/why")
def why_connected(case_id: int, a: str, b: str, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("""
        SELECT r.*, e.filename, e.sha256
        FROM relationships r
        LEFT JOIN evidence e ON e.id = r.evidence_id
        WHERE r.case_id=? AND (
            (r.source_value=? AND r.target_value=?) OR
            (r.source_value=? AND r.target_value=?)
        )
    """, (case_id, a[:200], b[:200], b[:200], a[:200]))
    direct = [dict(r) for r in c.fetchall()]
    conn.close()

    return {
        "from": a, "to": b,
        "direct_connections": len(direct),
        "evidence_trail": direct,
        "summary": f"{len(direct)} evidence-backed connection(s) found between {a} and {b}."
    }


@app.get("/api/cases/{case_id}/copilot")
def copilot(case_id: int, q: str, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    if not q or len(q) > 200:
        raise HTTPException(400, "Invalid query")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    terms = [t.strip()[:50] for t in q.split() if 2 < len(t.strip()) < 50]
    results = []
    for term in terms[:5]:
        c.execute("""
            SELECT DISTINCT type, value FROM entities
            WHERE case_id=? AND value LIKE ? LIMIT 10
        """, (case_id, f"%{term}%"))
        for r in c.fetchall():
            results.append(dict(r))

    seen, unique = set(), []
    for r in results:
        key = (r["type"], r["value"])
        if key not in seen:
            seen.add(key)
            unique.append(r)
    conn.close()

    return {"query": q, "matches": unique[:30],
            "note": "Results are citations from your case data."}


# ==================================================================
#                     CROSS-CASE SEARCH
# ==================================================================

@app.get("/api/cross-case/search")
def cross_case_search(q: str, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    if not q or len(q.strip()) < 2 or len(q) > 100:
        raise HTTPException(400, "Query must be 2-100 chars")

    term = q.strip()

    conn = get_db()
    c = conn.cursor()
    c.execute("""SELECT e.*, c.case_code, c.title, c.jurisdiction, c.sensitivity
                 FROM entities e
                 JOIN cases c ON c.id = e.case_id
                 WHERE e.value LIKE ?
                 ORDER BY c.id DESC LIMIT 100""", (f"%{term}%",))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    visible_rows = []
    for r in rows:
        conn2 = get_db()
        c2 = conn2.cursor()
        c2.execute("SELECT * FROM cases WHERE id=?", (r["case_id"],))
        full = c2.fetchone()
        conn2.close()
        if full and can_view_case(user, dict(full)):
            visible_rows.append(r)

    grouped = {}
    for r in visible_rows:
        key = (r["type"], r["value"])
        if key not in grouped:
            grouped[key] = {"type": r["type"], "value": r["value"], "cases": []}
        grouped[key]["cases"].append({
            "case_id": r["case_id"],
            "case_code": r["case_code"],
            "title": r["title"],
            "jurisdiction": r["jurisdiction"],
            "sensitivity": r["sensitivity"],
        })

    matches = [g for g in grouped.values() if len(g["cases"]) >= 2]
    return {
        "query": q,
        "total_matches": len(matches),
        "matches": sorted(matches, key=lambda x: -len(x["cases"])),
    }


# ==================================================================
#                     CASE NOTES
# ==================================================================

@app.get("/api/cases/{case_id}/notes")
def list_notes(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("SELECT * FROM case_notes WHERE case_id=? ORDER BY id DESC", (case_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@app.post("/api/cases/{case_id}/notes")
@limiter.limit("30/minute")
def add_note(request: Request, case_id: int, body: dict, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    note = (body.get("note") or "").strip()
    if not note or len(note) < 3:
        raise HTTPException(400, "Note too short")
    if len(note) > 5000:
        raise HTTPException(400, "Note too long (max 5000 chars)")

    conn = get_db()
    _check_case_access(case_id, user, conn, require_open=True)
    c = conn.cursor()
    c.execute("""INSERT INTO case_notes
                 (case_id, officer_id, officer_name, officer_rank, note, created_at)
                 VALUES (?,?,?,?,?,?)""",
              (case_id, user["id"], user.get("full_name", user["sub"]),
               user["rank"], note, datetime.utcnow().isoformat()))
    conn.commit()
    nid = c.lastrowid
    conn.close()

    log_action(user["id"], user["sub"], "ADD_NOTE", f"case={case_id}", rank=user["rank"])
    return {"id": nid, "message": "Note added"}


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No access")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM case_notes WHERE id=?", (note_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Note not found")

    if row["officer_id"] != user["id"] and user["rank"] not in ("SHO", "RegionalAdmin"):
        conn.close()
        raise HTTPException(403, "Can only delete own notes")

    c.execute("DELETE FROM case_notes WHERE id=?", (note_id,))
    conn.commit()
    conn.close()
    return {"message": "Note deleted"}


# ==================================================================
#                     COURT ORDER
# ==================================================================

COURT_ORDER_TYPES = {
    "CONVICTION",
    "ACQUITTAL",
    "DISCHARGE",
    "FURTHER_INVESTIGATION",
    "CLOSURE",
}

FINAL_STATUS_MAP = {
    "CONVICTION": "CONVICTED",
    "ACQUITTAL": "ACQUITTED",
    "DISCHARGE": "DISCHARGED",
    "CLOSURE": "CLOSED",
    "FURTHER_INVESTIGATION": "UNDER_INVESTIGATION",
}


@app.get("/api/cases/{case_id}/court-orders")
def list_court_orders(case_id: int, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    conn = get_db()
    _check_case_access(case_id, user, conn)
    c = conn.cursor()
    c.execute("""SELECT id, case_id, order_type, court_name, judge_name,
                        order_date, verdict_summary, sentence_details, directives,
                        document_filename, document_sha256, uploaded_at
                 FROM court_orders WHERE case_id=? ORDER BY id DESC""", (case_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.post("/api/cases/{case_id}/court-orders")
@limiter.limit("10/minute")
async def add_court_order(
    request: Request,
    case_id: int,
    body: dict,
    user=Depends(get_current_user),
):
    require_level(user, 2)

    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    order_type = (body.get("order_type") or "").strip()
    court_name = (body.get("court_name") or "").strip()[:200]
    judge_name = (body.get("judge_name") or "").strip()[:200]
    order_date = (body.get("order_date") or "").strip()[:20]
    verdict_summary = (body.get("verdict_summary") or "").strip()[:5000]
    sentence_details = (body.get("sentence_details") or "").strip()[:5000]
    directives = (body.get("directives") or "").strip()[:5000]
    file_base64 = body.get("file_base64") or ""
    file_name = (body.get("file_name") or "court_order.pdf").strip()

    if order_type not in COURT_ORDER_TYPES:
        raise HTTPException(400, f"order_type must be one of {sorted(COURT_ORDER_TYPES)}")

    if not court_name or not judge_name or not order_date or not verdict_summary:
        raise HTTPException(400, "court_name, judge_name, order_date, verdict_summary required")

    if not file_base64:
        raise HTTPException(400, "Court order PDF required")

    # Strip data URL prefix if present
    if "," in file_base64 and file_base64.startswith("data:"):
        file_base64 = file_base64.split(",", 1)[1]

    try:
        data = base64.b64decode(file_base64)
    except Exception:
        raise HTTPException(400, "Invalid file encoding")

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max {MAX_FILE_SIZE // (1024*1024)} MB")

    safe_name = sanitize_filename(file_name)
    ext = os.path.splitext(safe_name)[1].lower()
    if ext != ".pdf":
        raise HTTPException(400, "Court order must be a PDF file")

    # Magic byte check
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "File is not a valid PDF")

    conn = get_db()
    case = _check_case_access(case_id, user, conn)

    file_hash = sha256_of_bytes(data)

    c = conn.cursor()
    c.execute("""
        INSERT INTO court_orders
        (case_id, order_type, court_name, judge_name, order_date,
         verdict_summary, sentence_details, directives,
         document_filename, document_sha256, uploaded_by, uploaded_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        case_id, order_type, court_name, judge_name, order_date,
        verdict_summary, sentence_details, directives,
        safe_name, file_hash, user["id"], datetime.utcnow().isoformat()
    ))
    order_id = c.lastrowid

    new_status = FINAL_STATUS_MAP[order_type]
    finalized_at = None
    if order_type in ("CONVICTION", "ACQUITTAL", "DISCHARGE", "CLOSURE"):
        finalized_at = datetime.utcnow().isoformat()

    c.execute("""UPDATE cases
                 SET status=?, court_order_id=?, finalized_at=?
                 WHERE id=?""",
              (new_status, order_id, finalized_at, case_id))

    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "COURT_ORDER",
               f"case={case_id} type={order_type} judge={judge_name}",
               ip=request.client.host if request.client else "",
               rank=user["rank"])

    return {
        "id": order_id,
        "message": "Court order recorded",
        "case_status": new_status,
        "case_locked": finalized_at is not None,
        "sha256": file_hash,
    }


# ==================================================================
#                       AUDIT
# ==================================================================

@app.get("/api/audit")
def audit(user=Depends(get_current_user)):
    rank = user["rank"]
    require_level(user, 2)

    conn = get_db()
    c = conn.cursor()

    if rank == "SystemAdmin":
        c.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500")
    elif rank == "RegionalAdmin":
        c.execute("""SELECT * FROM audit_logs
                     WHERE rank IN ('SHO','Investigator','RegionalAdmin')
                     ORDER BY id DESC LIMIT 500""")
    elif rank == "SHO":
        c.execute("""SELECT * FROM audit_logs
                     WHERE rank='Investigator'
                     ORDER BY id DESC LIMIT 500""")
    else:
        conn.close()
        raise HTTPException(403, "Access denied")

    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


# ==================================================================
#                  ENTITY TYPES + MANUAL ADD
# ==================================================================

@app.get("/api/entity-types")
def get_entity_types(user=Depends(get_current_user)):
    result = {}
    for cat, types in ENTITY_CATEGORIES.items():
        result[cat] = []
        for t in types:
            v = VALIDATORS.get(t)
            result[cat].append({
                "name": t,
                "hint": v[1] if v else "",
                "example": v[2] if v else "",
            })
    return result


@app.post("/api/cases/{case_id}/entities")
@limiter.limit("60/minute")
def add_entity(request: Request, case_id: int, body: dict, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    etype = (body.get("type") or "").strip()[:40]
    value = (body.get("value") or "").strip()[:200]
    if not etype or not value:
        raise HTTPException(400, "Both type and value are required")

    ok, err = validate_entity(etype, value)
    if not ok:
        raise HTTPException(400, err)

    conn = get_db()
    _check_case_access(case_id, user, conn, require_open=True)
    c = conn.cursor()
    c.execute("SELECT id FROM entities WHERE case_id=? AND type=? AND value=?",
              (case_id, etype, value))
    if c.fetchone():
        conn.close()
        raise HTTPException(400, f"Duplicate: {etype} '{value}' already exists")

    c.execute("INSERT INTO entities (case_id, type, value, evidence_id) VALUES (?,?,?,?)",
              (case_id, etype, value, None))
    conn.commit()
    eid = c.lastrowid
    conn.close()

    log_action(user["id"], user["sub"], "ADD_ENTITY", f"{etype}: {value}", rank=user["rank"])
    return {"id": eid, "message": "Entity added", "type": etype, "value": value}


@app.post("/api/cases/{case_id}/manual-link")
@limiter.limit("60/minute")
def manual_link(request: Request, case_id: int, body: dict, user=Depends(get_current_user)):
    if user["rank"] == "SystemAdmin":
        raise HTTPException(403, "No case access")

    required = ["source_type", "source_value", "target_type", "target_value"]
    for r in required:
        if not body.get(r):
            raise HTTPException(400, f"{r} is required")

    src_type = body["source_type"].strip()[:40]
    src_val = body["source_value"].strip()[:200]
    tgt_type = body["target_type"].strip()[:40]
    tgt_val = body["target_value"].strip()[:200]

    ok, err = validate_entity(src_type, src_val)
    if not ok:
        raise HTTPException(400, f"From value invalid: {err}")
    ok, err = validate_entity(tgt_type, tgt_val)
    if not ok:
        raise HTTPException(400, f"To value invalid: {err}")

    if src_type == tgt_type and src_val.lower() == tgt_val.lower():
        raise HTTPException(400, "Source and target cannot be same")

    conn = get_db()
    _check_case_access(case_id, user, conn, require_open=True)
    c = conn.cursor()

    for etype, eval_ in [(src_type, src_val), (tgt_type, tgt_val)]:
        c.execute("INSERT OR IGNORE INTO entities (case_id, type, value, evidence_id) VALUES (?,?,?,?)",
                  (case_id, etype, eval_, None))

    c.execute("""
        SELECT id FROM relationships
        WHERE case_id=? AND source_type=? AND source_value=?
          AND target_type=? AND target_value=?
    """, (case_id, src_type, src_val, tgt_type, tgt_val))
    if c.fetchone():
        conn.close()
        raise HTTPException(400, "This connection already exists")

    c.execute("""
        INSERT INTO relationships
        (case_id, source_type, source_value, target_type, target_value,
         relation, evidence_id, weight)
        VALUES (?,?,?,?,?,?,?,?)
    """, (case_id, src_type, src_val, tgt_type, tgt_val,
          (body.get("relation") or "manually_linked")[:40], None, 1))
    conn.commit()
    conn.close()

    log_action(user["id"], user["sub"], "MANUAL_LINK",
               f"{src_val} -> {tgt_val}", rank=user["rank"])
    return {"message": "Connection created"}


# ============ ROOT ============
@app.get("/")
def root():
    return {"service": "NETRA API", "status": "running"}


# ============ GLOBAL ERROR HANDLER ============
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log_action(0, "SYSTEM", "UNHANDLED_ERROR",
               f"{type(exc).__name__}: {str(exc)[:200]}",
               ip=request.client.host if request.client else "",
               rank="SYSTEM")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ============ NETWORK RUN ============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
