from fastapi import APIRouter
import sys
from schemas.system import HealthResponse, InfoResponse
from core.config import settings
from services.java_compiler import JAVA_AVAILABLE

# We'll need a way to access interactive_processes
# For now, we'll import it from sockets (which we'll create next)
# Or a better way is to have a shared manager

router = APIRouter(prefix="/api", tags=["system"])

@router.get("/health", response_model=HealthResponse)
async def health():
    from .sockets import interactive_processes
    return HealthResponse(
        status="ok",
        os=settings.SYSTEM,
        java_available=JAVA_AVAILABLE,
        is_windows=settings.IS_WINDOWS,
        is_linux=settings.IS_LINUX,
        interactive_sessions=len(interactive_processes)
    )

@router.get("/info", response_model=InfoResponse)
async def info():
    return InfoResponse(
        name="Java Compiler Server",
        os=settings.SYSTEM,
        is_windows=settings.IS_WINDOWS,
        is_linux=settings.IS_LINUX,
        is_mac=settings.IS_MAC,
        java_available=JAVA_AVAILABLE,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}"
    )
