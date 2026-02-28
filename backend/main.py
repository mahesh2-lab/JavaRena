import os
import glob
import sys
import platform
import asyncio
from typing import Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import socketio

from core.config import settings
from core.database import init_share_db
from routers import share, compile, system, sockets
from services.share_service import cleanup_expired_shares_task
from services.java_compiler import find_java, JAVAC_PATH, JAVA_PATH
from utils.helpers import _boot_step, _boot_step_fail, get_java_version

# Boot Animation/Info (Preserved from Flask)
def print_boot_banner():
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    RESET = "\033[0m"
    MAGENTA = "\033[95m"

    print()
    print(f"{CYAN}╔══════════════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{CYAN}║                                                                      ║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}██╗ █████╗ ██╗   ██╗ █████╗ ██████╗ ███████╗███╗   ██╗ █████╗      {RESET} {CYAN}║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}██║██╔══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗     {RESET} {CYAN}║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}██║███████║██║   ██║███████║██████╔╝█████╗  ██╔██╗ ██║███████║     {RESET} {CYAN}║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}██║██╔══██║╚██╗ ██╔╝██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║     {RESET}{CYAN} ║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}██║██║  ██║ ╚████╔╝ ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║     {RESET}{CYAN} ║{RESET}")
    print(f"{CYAN}║{RESET}  {GREEN}{BOLD}╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝     {RESET}{CYAN} ║{RESET}")
    print(f"{CYAN}║                                                                      ║{RESET}")
    print(f"{CYAN}╚══════════════════════════════════════════════════════════════════════╝{RESET}")
    print()

    print(f"  {YELLOW}{BOLD}[BOOT]{RESET} {DIM}Jyvra v2.0 — FastAPI Production API{RESET}")
    print()

    os_label = settings.SYSTEM
    if settings.IS_WINDOWS:
        os_label = f"Windows ({platform.release()})"
    _boot_step("Detecting host OS", os_label)

    java_available = find_java()
    if java_available:
        _boot_step("Locating javac binary", JAVAC_PATH)
        jvm_ver = get_java_version(JAVA_PATH)
        _boot_step("Verifying JVM heartbeat", jvm_ver)
    else:
        _boot_step_fail("Locating javac binary", "NOT FOUND")
        _boot_step_fail("Verifying JVM heartbeat", "Skipped (no Java)")

    _boot_step("Raising FastAPI + Socket.IO server", "Uvicorn/Gunicorn")
    _boot_step("Mounting API endpoints", "Ready")
    
    # Static distribution path logic
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_path = os.path.join(base_dir, "dist")
    if not os.path.exists(dist_path):
        dist_path = os.path.abspath(os.path.join(base_dir, "..", "frontend", "dist"))
    
    _boot_step("Mounting Frontend (SPA)", dist_path if os.path.exists(dist_path) else "NOT FOUND")
    _boot_step("Initializing interactive terminal engine", "xterm.js + WebSocket")
    
    init_share_db()
    _boot_step("Initializing share database", "SQLite ready")
    _boot_step("Starting cleanup daemon", "Background task active")
    
    print()
    print(f"  {GREEN}{BOLD}[SYSTEM]{RESET} {BOLD}Jyvra is open.{RESET}")
    print()

# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print_boot_banner()
    # Start cleanup task in the background
    asyncio.create_task(cleanup_expired_shares_task())
    yield
    # Shutdown logic (process cleanup if needed)
    from routers.sockets import interactive_processes, _kill_process
    sids = list(interactive_processes.keys())
    for sid in sids:
        _kill_process(sid)

app = FastAPI(
    title="Java Arena API",
    description="Backend for interactive Java execution and visualization",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(share.router)
app.include_router(compile.router)
app.include_router(system.router)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sockets.sio, other_asgi_app=app)

# SPA Distribution Path
base_dir = os.path.dirname(os.path.abspath(__file__))
dist_path = os.path.join(base_dir, "dist")
if not os.path.exists(dist_path):
    dist_path = os.path.abspath(os.path.join(base_dir, "..", "frontend", "dist"))

# Serve robots.txt
@app.get("/robots.txt", response_class=Response)
async def robots_txt():
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    robots_path = os.path.join(public_dir, 'robots.txt')
    if os.path.exists(robots_path):
        with open(robots_path, 'r') as f:
            content = f.read()
        return Response(content=content, media_type='text/plain')
    return Response(content="User-agent: *\nDisallow:", media_type='text/plain')

# Dynamic Sitemap
@app.get("/sitemap.xml", response_class=Response)
async def sitemap(request: Request):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    md_files = glob.glob(os.path.join(public_dir, '*.md'))
    base_url = str(request.base_url).rstrip('/')
    urls = []
    for md_file in md_files:
        slug = os.path.splitext(os.path.basename(md_file))[0]
        loc = f'{base_url}/blog/{slug}'
        lastmod = datetime.fromtimestamp(os.path.getmtime(md_file)).strftime('%Y-%m-%d')
        urls.append(f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod}</lastmod>\n  </url>')
    
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{chr(10).join(urls)}\n</urlset>'
    return Response(content=xml, media_type='application/xml')

# Blog Redirects
@app.get("/blog/")
async def redirect_blog():
    return RedirectResponse(url="/blog/docker-for-java-beginners")

@app.get("/blog/{slug}")
async def serve_blog(slug: str):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    blog_html = os.path.join(public_dir, 'blog.html')
    if os.path.exists(blog_html):
        return FileResponse(blog_html)
    raise HTTPException(status_code=404)

@app.get("/blog/{slug}.md")
async def serve_blog_md(slug: str):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    md_path = os.path.join(public_dir, f"{slug}.md")
    if os.path.exists(md_path):
        return FileResponse(md_path)
    raise HTTPException(status_code=404)

# Serve Public Files
if os.path.exists(os.path.join(os.path.dirname(__file__), 'public')):
    app.mount("/public", StaticFiles(directory=os.path.join(os.path.dirname(__file__), 'public')), name="public")

# Serve SPA Static files
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

# Catch-all for SPA routing
@app.exception_handler(404)
async def spa_fallback(request: Request, exc: HTTPException):
    # If the request is for an API or static file that doesn't exist, return 404
    if request.url.path.startswith("/api/") or "." in request.url.path.split("/")[-1]:
        return Response(content=f"Not Found: {request.url.path}", status_code=404)
    
    # Otherwise return index.html for SPA routing
    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return Response(content="Not Found", status_code=404)

# Production entry point: uvicorn main:socket_app --host 0.0.0.0 --port 5000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=5000, reload=True)
