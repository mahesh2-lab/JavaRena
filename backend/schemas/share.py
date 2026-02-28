from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ShareCreate(BaseModel):
    code: str = Field(..., max_length=50000)
    output: Optional[str] = ""

class ShareResponse(BaseModel):
    success: bool
    id: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None

class ShareDetail(BaseModel):
    success: bool
    code: Optional[str] = None
    output: Optional[str] = None
    views: Optional[int] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None
