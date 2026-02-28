from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
import sqlite3
from datetime import datetime, timedelta
from core.config import settings
from dependencies.database import get_db
from schemas.share import ShareCreate, ShareResponse, ShareDetail
from services.share_service import check_rate_limit, generate_share_id, sanitize_code
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/api", tags=["share"])

@router.post("/share", response_model=ShareResponse)
async def create_share(
    share_data: ShareCreate, 
    request: Request,
    conn: sqlite3.Connection = Depends(get_db)
):
    # Pass request to check_rate_limit since we removed Flask request global
    if not check_rate_limit(request):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")

    code = share_data.code
    output = share_data.output or ""

    if not code or not code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    code = sanitize_code(code)
    output = sanitize_code(output)

    share_id = generate_share_id()
    expires_at = datetime.now() + timedelta(days=30)

    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO shares (id, code, output, expires_at)
            VALUES (?, ?, ?, ?)
        """, (share_id, code, output, expires_at.isoformat()))
        conn.commit()

        return ShareResponse(
            success=True,
            id=share_id,
            expires_at=expires_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/share/{share_id}", response_model=ShareDetail)
async def get_share(
    share_id: str, 
    conn: sqlite3.Connection = Depends(get_db)
):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT code, output, views, created_at, expires_at
            FROM shares WHERE id = ?
        """, (share_id,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Share not found")

        code, output, views, created_at, expires_at = result
        if datetime.fromisoformat(expires_at) < datetime.now():
            raise HTTPException(status_code=410, detail="Share has expired")

        cursor.execute(
            "UPDATE shares SET views = views + 1 WHERE id = ?", (share_id,))
        conn.commit()

        return ShareDetail(
            success=True,
            code=code,
            output=output,
            views=views + 1,
            created_at=created_at,
            expires_at=expires_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/share-images/{filename}")
async def serve_share_image(filename: str):
    image_path = os.path.join(settings.SHARE_IMAGES_DIR, filename)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)
