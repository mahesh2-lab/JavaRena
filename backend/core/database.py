import sqlite3
import os
from .config import settings

def init_share_db():
    """Initialize SQLite database for shares"""
    os.makedirs(settings.SHARE_IMAGES_DIR, exist_ok=True)

    conn = sqlite3.connect(settings.DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shares (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            output TEXT,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            image_path TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Share database initialized")
