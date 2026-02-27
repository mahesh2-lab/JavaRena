# Serve robots.txt from public directory
import platform
import flask
import sys
import os
import threading
import time
from flask import Flask, Response, send_from_directory, request
from flask_cors import CORS
from flask_socketio import SocketIO
from flask import send_from_directory, request, Response, jsonify
import glob
from datetime import datetime
from core.config import SECRET_KEY, REQUIRED_PACKAGES, SYSTEM, IS_WINDOWS, IS_LINUX, IS_MAC
from core.database import init_share_db
from utils.helpers import _boot_step, _boot_step_fail, get_java_version
import services.java_compiler as jc
from services.share_service import cleanup_expired_shares
from api.routes import register_routes
from api.sockets import register_socket_events
from flask import send_from_directory


# Redirect /blog/ to default blog slug


# Eventlet monkey patching for non-Windows platforms
try:
    if platform.system() != "Windows":
        import eventlet
        eventlet.monkey_patch()
        print("[BOOT] Eventlet monkey patching applied")
    else:
        print(
            "[BOOT] Skipping eventlet monkey patching on Windows to avoid process conflicts")
except ImportError:
    pass

# Import local modules

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
# Try to find the dist folder (check same-dir for Docker and ../frontend/dist for local dev)
base_dir = os.path.dirname(os.path.abspath(__file__))
dist_path = os.path.join(base_dir, "dist")
if not os.path.exists(dist_path):
    dist_path = os.path.abspath(os.path.join(
        base_dir, "..", "frontend", "dist"))

app = Flask(__name__,
            static_folder=dist_path,
            template_folder=dist_path,
            static_url_path='')
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app, origins="*")

# Initialize Socket.IO
# For Windows development, polling is more stable with the Werkzeug dev server
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    # Allow both but polling is usually preferred on Windows dev # type: ignore
    transports=['polling', 'websocket'],
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

# Register API and Sockets
register_routes(app)
register_socket_events(socketio)

# Serve SPA


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


@app.route('/blog/')
def redirect_blog_default():
    return flask.redirect('/blog/docker-for-java-beginners')


@app.route('/blog/<slug>')
def serve_blog_html(slug):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    return send_from_directory(public_dir, 'blog.html')


@app.route('/blog/<slug>.md')
def serve_blog_md(slug):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    filename = f'{slug}.md'
    return send_from_directory(public_dir, filename)


@app.route('/sitemap.xml')
def dynamic_sitemap():
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    md_files = glob.glob(os.path.join(public_dir, '*.md'))
    base_url = request.host_url.rstrip('/')
    urls = []
    for md_file in md_files:
        slug = os.path.splitext(os.path.basename(md_file))[0]
        loc = f'{base_url}/blog/{slug}'
        lastmod = datetime.fromtimestamp(
            os.path.getmtime(md_file)).strftime('%Y-%m-%d')
        urls.append(
            f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod}</lastmod>\n  </url>')
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{chr(10).join(urls)}\n</urlset>'
    return Response(xml, mimetype='application/xml')


@app.route('/robots.txt')
def robots_txt():
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    robots_path = os.path.join(public_dir, 'robots.txt')
    if os.path.exists(robots_path):
        with open(robots_path, 'r') as f:
            content = f.read()
        return Response(content, mimetype='text/plain')
    else:
        return Response("User-agent: *\nDisallow:", mimetype='text/plain')


@app.route('/public/<path:filename>')
def serve_public_file(filename):
    public_dir = os.path.join(os.path.dirname(__file__), 'public')
    return send_from_directory(public_dir, filename)


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

    print(
        f"  {YELLOW}{BOLD}[BOOT]{RESET} {DIM}JavaRena v2.0 — Interactive Terminal Protocol{RESET}")
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
    _boot_step("Mounting Frontend (SPA)",
               dist_path if os.path.exists(dist_path) else "NOT FOUND")
    _boot_step("Initializing interactive terminal engine",
               "xterm.js + WebSocket")

    init_share_db()
    _boot_step("Initializing share database", "SQLite ready")

    cleanup_thread = threading.Thread(
        target=cleanup_expired_shares, daemon=True)
    cleanup_thread.start()
    _boot_step("Starting cleanup daemon", "Background task active")

    print()
    print(f"  {GREEN}{BOLD}[SYSTEM]{RESET} {BOLD}The Arena is open.{RESET}")
    print()

    if not java_available:
        print(
            f"  {YELLOW}{BOLD}⚠  WARNING:{RESET}{YELLOW} Java compiler (javac) not found!{RESET}")
        print()

    print(f"  {MAGENTA}{BOLD}>>> Listening on http://localhost:5000{RESET}")
    print()

    if os.environ.get('FLASK_ENV') == 'development' or IS_WINDOWS:
        # Development mode
        socketio.run(app, host="0.0.0.0", port=5000, debug=False,
                     use_reloader=False, allow_unsafe_werkzeug=True)
    else:
        # Production mode using Waitress
        from waitress import serve
        print(
            f"  {GREEN}{BOLD}[PRODUCTION]{RESET} {BOLD}Serving with Waitress...{RESET}")
        serve(app, host="0.0.0.0", port=5000)
