import sqlite3
from core.config import settings

def get_db():
    conn = sqlite3.connect(settings.DB_PATH)
    try:
        yield conn
    finally:
        conn.close()
