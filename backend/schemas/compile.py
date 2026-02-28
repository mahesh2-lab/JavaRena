from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class CompileRequest(BaseModel):
    code: str
    stdin: Optional[str] = ""

class CompileResponse(BaseModel):
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    os: Optional[str] = None
    ai_review: Optional[str] = None
    error_review: Optional[Dict[str, Any]] = None
    needs_input: Optional[bool] = None

class VisualizeRequest(BaseModel):
    code: str

class VisualizeResponse(BaseModel):
    success: bool
    steps: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
