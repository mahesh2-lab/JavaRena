from pydantic import BaseModel
from typing import Optional

class HealthResponse(BaseModel):
    status: str
    os: str
    java_available: bool
    is_windows: bool
    is_linux: bool
    interactive_sessions: int

class InfoResponse(BaseModel):
    name: str
    os: str
    is_windows: bool
    is_linux: bool
    is_mac: bool
    java_available: bool
    python_version: str
