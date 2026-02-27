import platform
import sys
import os
import threading
import time

# Eventlet monkey patching for non-Windows platforms
try:
    if platform.system() != "Windows":
        import eventlet
        eventlet.monkey_patch()
        print("[BOOT] Eventlet monkey patching applied")
    else:
        print("[BOOT] Skipping eventlet monkey patching on Windows to avoid process conflicts")
except ImportError:
    pass

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

# Import local modules
from core.config import SECRET_KEY, REQUIRED_PACKAGES, SYSTEM, IS_WINDOWS, IS_LINUX, IS_MAC
from core.database import init_share_db
from utils.helpers import _boot_step, _boot_step_fail, get_java_version
import services.java_compiler as jc
from services.share_service import cleanup_expired_shares
from api.routes import register_routes
from api.sockets import register_socket_events

# Dependency check
_missing = []
for _mod, _pkg in REQUIRED_PACKAGES.items():
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_pkg)

if _missing:
    print(f"\n[ERROR] Missing required Python packages: {', '.join(_missing)}")
    sys.exit(1)

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app, origins="*")

# Initialize Socket.IO
# For Windows development, polling is more stable with the Werkzeug dev server
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    transports=['polling', 'websocket'], # Allow both but polling is usually preferred on Windows dev
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

# Register API and Sockets
register_routes(app)
register_socket_events(socketio)

if __name__ == "__main__":
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

    print(f"  {YELLOW}{BOLD}[BOOT]{RESET} {DIM}JavaRena v2.0 — Interactive Terminal Protocol{RESET}")
    print()

    os_label = f"{SYSTEM}"
    if IS_WINDOWS:
        os_label = f"Windows ({platform.release()})"
    elif IS_LINUX:
        os_label = "Linux"
    elif IS_MAC:
        os_label = "macOS"
    _boot_step("Detecting host OS", os_label)

    java_available = jc.find_java()
    
    if java_available:
        _boot_step("Locating javac binary", jc.JAVAC_PATH)
        jvm_ver = get_java_version(jc.JAVA_PATH)
        _boot_step("Verifying JVM heartbeat", jvm_ver)
    else:
        _boot_step_fail("Locating javac binary", "NOT FOUND")
        _boot_step_fail("Verifying JVM heartbeat", "Skipped (no Java)")

    _boot_step("Raising Flask + Socket.IO server", "Port 5000")
    _boot_step("Mounting API endpoints", "Ready")
    _boot_step("Initializing interactive terminal engine", "xterm.js + WebSocket")

    init_share_db()
    _boot_step("Initializing share database", "SQLite ready")

    cleanup_thread = threading.Thread(target=cleanup_expired_shares, daemon=True)
    cleanup_thread.start()
    _boot_step("Starting cleanup daemon", "Background task active")

    print()
    print(f"  {GREEN}{BOLD}[SYSTEM]{RESET} {BOLD}The Arena is open.{RESET}")
    print()

    if not java_available:
        print(f"  {YELLOW}{BOLD}⚠  WARNING:{RESET}{YELLOW} Java compiler (javac) not found!{RESET}")
        print()

    print(f"  {MAGENTA}{BOLD}>>> Listening on http://localhost:5000{RESET}")
    print()

    if os.environ.get('FLASK_ENV') == 'development' or IS_WINDOWS:
        # Development mode
        socketio.run(app, host="0.0.0.0", port=5000, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
    else:
        # Production mode using Waitress
        from waitress import serve
        print(f"  {GREEN}{BOLD}[PRODUCTION]{RESET} {BOLD}Serving with Waitress...{RESET}")
        serve(app, host="0.0.0.0", port=5000)

