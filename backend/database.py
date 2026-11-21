import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "netra.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS officers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        rank TEXT NOT NULL,
        jurisdiction TEXT NOT NULL,
        station TEXT DEFAULT '',
        clearance TEXT NOT NULL DEFAULT 'RESTRICTED',
        is_active INTEGER DEFAULT 1,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        created_by INTEGER,
        created_at TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        sensitivity TEXT NOT NULL DEFAULT 'RESTRICTED',
        jurisdiction TEXT NOT NULL,
        station TEXT DEFAULT '',
        status TEXT DEFAULT 'OPEN',
        assigned_to INTEGER,
        created_by INTEGER,
        created_at TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        uploaded_by INTEGER,
        uploaded_at TEXT,
        raw_text TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        evidence_id INTEGER,
        UNIQUE(case_id, type, value)
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        source_type TEXT, source_value TEXT,
        target_type TEXT, target_value TEXT,
        relation TEXT,
        evidence_id INTEGER,
        weight INTEGER DEFAULT 1
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        officer_id INTEGER,
        username TEXT,
        rank TEXT,
        action TEXT,
        details TEXT,
        ip TEXT,
        timestamp TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS case_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        officer_id INTEGER,
        officer_name TEXT,
        officer_rank TEXT,
        note TEXT NOT NULL,
        created_at TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        alert_type TEXT,
        severity TEXT,
        title TEXT,
        description TEXT,
        involved TEXT,
        created_at TEXT,
        acknowledged INTEGER DEFAULT 0
    )
    """)

    # ---- MIGRATIONS: existing DBs ko update karo ----
    def add_column_if_missing(table, column, definition):
        try:
            c.execute(f"PRAGMA table_info({table})")
            existing = [row[1] for row in c.fetchall()]
            if column not in existing:
                c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                print(f"[MIGRATION] Added {table}.{column}")
        except Exception as e:
            print(f"[MIGRATION ERROR] {table}.{column}: {e}")

    add_column_if_missing("cases", "status", "TEXT DEFAULT 'OPEN'")
    add_column_if_missing("cases", "station", "TEXT DEFAULT ''")
    add_column_if_missing("cases", "assigned_to", "INTEGER")
    add_column_if_missing("officers", "station", "TEXT DEFAULT ''")
    add_column_if_missing("officers", "is_active", "INTEGER DEFAULT 1")
    add_column_if_missing("officers", "failed_attempts", "INTEGER DEFAULT 0")
    add_column_if_missing("officers", "locked_until", "TEXT")
    add_column_if_missing("officers", "created_by", "INTEGER")
    add_column_if_missing("audit_logs", "rank", "TEXT DEFAULT ''")

    conn.commit()
    conn.close()


def log_action(officer_id, username, action, details="", ip="", rank=""):
    conn = get_db()
    conn.execute(
        "INSERT INTO audit_logs (officer_id, username, rank, action, details, ip, timestamp) VALUES (?,?,?,?,?,?,?)",
        (officer_id, username, rank, action, details, ip, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()