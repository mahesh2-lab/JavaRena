import os
import sqlite3
import time
from datetime import datetime
from nanoid import generate
from core.config import settings
from fastapi import Request

# Rate limit storage
rate_limit_storage = {}

def generate_share_id():
    """Generate a unique short ID for shares"""
    return generate(size=10)

def sanitize_code(code):
    """Validate code input"""
    return code

def check_rate_limit(request: Request):
    """Check if client has exceeded rate limit"""
    # Get client IP from FastAPI request
    client_ip = request.client.host
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0]
    
    current_time = time.time()

    if client_ip not in rate_limit_storage:
        rate_limit_storage[client_ip] = []

    rate_limit_storage[client_ip] = [
        ts for ts in rate_limit_storage[client_ip]
        if current_time - ts < settings.RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_storage[client_ip]) >= settings.RATE_LIMIT_MAX:
        return False

    rate_limit_storage[client_ip].append(current_time)
    return True

async def cleanup_expired_shares_task():
    """Background task to cleanup expired shares and images"""
    while True:
        try:
            # We use 1 hour interval as in the original code
            # But we'll run it once at startup and then every hour
            conn = sqlite3.connect(settings.DB_PATH)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, image_path FROM shares 
                WHERE expires_at < datetime('now')
            """)
            expired = cursor.fetchall()

            cursor.execute(
                "DELETE FROM shares WHERE expires_at < datetime('now')")
            conn.commit()

            for share_id, image_path in expired:
                if image_path and os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                    except Exception as e:
                        print(f"[CLEANUP] Failed to delete image {image_path}: {e}")

            if len(expired) > 0:
                print(f"[CLEANUP] Cleaned up {len(expired)} expired shares")
            conn.close()

        except Exception as e:
            print(f"[CLEANUP] Error during cleanup: {e}")
            
        import asyncio
        await asyncio.sleep(3600)
