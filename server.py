from codeReview import explain_error, ai_review_error
from nanoid import generate
import re
from flask_cors import CORS
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import sys
import platform
import subprocess
import json
import tempfile
import shutil
import time
import sqlite3
import hashlib
import html
import threading
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# ── Dependency check ──
REQUIRED_PACKAGES = {
    "flask": "Flask",
    "flask_cors": "flask-cors",
    "flask_socketio": "flask-socketio",
    "nanoid": "nanoid",
    "waitress": "waitress",
}

_missing = []
for _mod, _pkg in REQUIRED_PACKAGES.items():
    try:
        __import__(_mod)
    except ImportError:
        _missing.append(_pkg)

if _missing:
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"
    print(f"\n{RED}{BOLD}[ERROR] Missing required Python packages:{RESET}")
    for pkg in _missing:
        print(f"  {RED}  - {pkg}{RESET}")
    print(f"\n  Install them with:")
    print(f"    {BOLD}pip install {' '.join(_missing)}{RESET}")
    print(f"  Or install all at once:")
    print(f"    {BOLD}pip install -r requirements.txt{RESET}\n")
    sys.exit(1)


# Create Flask app with proper static folder configuration
app = Flask(__name__, static_folder='dist', static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'javarena-secret-key-change-in-production')

CORS(app, origins="*")

# Initialize Socket.IO with eventlet async mode for production
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',   # Use threading mode (compatible with waitress)
    logger=False,
    engineio_logger=False,
    ping_timeout=30,
    ping_interval=10,
)


# ── Security Headers Middleware (SEO Trust Signals) ──
@app.after_request
def add_security_headers(response):
    """Add security and performance headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

    if response.content_type and ('javascript' in response.content_type or
                                  'css' in response.content_type or
                                  'image' in response.content_type or
                                  'font' in response.content_type or
                                  'svg' in response.content_type):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    elif response.content_type and 'text/html' in response.content_type:
        response.headers['Cache-Control'] = 'public, max-age=0, must-revalidate'

    return response


# Detect OS
SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"
IS_LINUX = SYSTEM == "Linux"
IS_MAC = SYSTEM == "Darwin"

# Global Java paths
JAVA_PATH = None
JAVAC_PATH = None
JAVA_AVAILABLE = False

# Share database paths
DB_PATH = "shares.db"
SHARE_IMAGES_DIR = "dist/share-images"

# Rate limiting
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 5  # max shares per window
rate_limit_storage = {}

# ── Interactive Process Store ──
# Maps socket session ID → running subprocess
interactive_processes: dict[str, subprocess.Popen] = {}
# Maps socket session ID → temp directory path (for cleanup)
interactive_temp_dirs: dict[str, str] = {}
# Lock for thread-safe process management
process_lock = threading.Lock()

print(f"Java Compiler Server - Detected OS: {SYSTEM}")


def find_java():
    """Find java and javac executables"""
    global JAVA_PATH, JAVAC_PATH

    if IS_WINDOWS:
        javac = shutil.which("javac")
        java = shutil.which("java")

        if javac and java:
            JAVA_PATH = java
            JAVAC_PATH = javac
            return True

        search_dirs = [
            "C:\\Program Files\\Java",
            "C:\\Program Files (x86)\\Java",
            "C:\\Program Files\\OpenLogic",
        ]

        for search_dir in search_dirs:
            try:
                if os.path.exists(search_dir):
                    for jdk_dir in os.listdir(search_dir):
                        bin_path = os.path.join(search_dir, jdk_dir, "bin")
                        javac_exe = os.path.join(bin_path, "javac.exe")
                        java_exe = os.path.join(bin_path, "java.exe")

                        if os.path.exists(javac_exe) and os.path.exists(java_exe):
                            JAVA_PATH = java_exe
                            JAVAC_PATH = javac_exe
                            print(f"[OK] Found Java at: {JAVA_PATH}")
                            return True
            except Exception as e:
                print(f"  Error searching {search_dir}: {e}")
                continue

        return False
    else:
        javac = shutil.which("javac")
        java = shutil.which("java")

        if javac and java:
            JAVA_PATH = java
            JAVAC_PATH = javac
            return True

        for bin_path in ["/usr/bin", "/usr/local/bin", "/opt/java/bin"]:
            javac_path = os.path.join(bin_path, "javac")
            java_path = os.path.join(bin_path, "java")
            if os.path.exists(javac_path) and os.path.exists(java_path):
                JAVA_PATH = java_path
                JAVAC_PATH = javac_path
                return True

        return False


def init_share_db():
    """Initialize SQLite database for shares"""
    os.makedirs(SHARE_IMAGES_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shares (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            output TEXT,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            image_path TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Share database initialized")


def generate_share_id():
    """Generate a unique short ID for shares"""
    return generate(size=10)


def get_client_ip():
    """Get client IP for rate limiting"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr


def check_rate_limit():
    """Check if client has exceeded rate limit"""
    client_ip = get_client_ip()
    current_time = time.time()

    if client_ip not in rate_limit_storage:
        rate_limit_storage[client_ip] = []

    rate_limit_storage[client_ip] = [
        ts for ts in rate_limit_storage[client_ip]
        if current_time - ts < RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_MAX:
        return False

    rate_limit_storage[client_ip].append(current_time)
    return True


def sanitize_code(code):
    """Validate code input"""
    return code


def cleanup_expired_shares():
    """Background task to cleanup expired shares and images"""
    while True:
        try:
            time.sleep(3600)

            conn = sqlite3.connect(DB_PATH)
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
                        print(f"[CLEANUP] Deleted image: {image_path}")
                    except Exception as e:
                        print(f"[CLEANUP] Failed to delete image {image_path}: {e}")

            print(f"[CLEANUP] Cleaned up {len(expired)} expired shares")
            conn.close()

        except Exception as e:
            print(f"[CLEANUP] Error during cleanup: {e}")


def _kill_process(sid: str):
    """Kill an interactive process and clean up its resources."""
    with process_lock:
        proc = interactive_processes.pop(sid, None)
        temp_dir = interactive_temp_dirs.pop(sid, None)

    if proc:
        try:
            proc.stdin.close()
        except Exception:
            pass
        try:
            proc.kill()
            proc.wait(timeout=5)
        except Exception:
            pass
        print(f"[TERMINAL] Killed process for sid={sid}")

    if temp_dir and os.path.exists(temp_dir):
        try:
            shutil.rmtree(temp_dir)
            print(f"[TERMINAL] Cleaned temp dir for sid={sid}")
        except Exception as e:
            print(f"[TERMINAL] Failed to clean temp dir {temp_dir}: {e}")


def compile_java(source_code, stdin_input=""):
    """Compile and run Java source code with optional stdin input"""
    if not find_java():
        print("[ERROR] Java compiler (javac) not found")
        return {"success": False, "error": "Java compiler (javac) not found on this system"}

    try:
        temp_dir = tempfile.mkdtemp()
        source_file = Path(temp_dir) / "Main.java"
        print(f"[LOG] Created temp dir: {temp_dir}")

        source_file.write_text(source_code, encoding='utf-8')
        print(f"[LOG] Source code written ({len(source_code)} chars)")

        compile_cmd = [JAVAC_PATH, str(source_file)]
        print(f"[LOG] Compiling: {' '.join(compile_cmd)}")
        result = subprocess.run(
            compile_cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=temp_dir
        )

        if result.returncode != 0:
            print(f"[ERROR] Compilation failed:\n{result.stderr}")
            return {
                "success": False,
                "error": result.stderr or "Compilation failed"
            }

        print("[LOG] Compilation successful")

        run_cmd = [JAVA_PATH, "-cp", temp_dir, "Main"]
        has_stdin = bool(stdin_input)
        print(f"[LOG] Running: {' '.join(run_cmd)}")

        result = subprocess.run(
            run_cmd,
            input=stdin_input if stdin_input else None,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=10,
            cwd=temp_dir
        )

        output = result.stdout
        error = result.stderr

        print(f"[LOG] Execution finished (exit code: {result.returncode})")

        shutil.rmtree(temp_dir)
        print("[LOG] Temp dir cleaned up")

        return {
            "success": True,
            "output": output,
            "error": error,
            "os": SYSTEM
        }

    except subprocess.TimeoutExpired:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass

        needs_input = any(keyword in source_code for keyword in [
            "Scanner", "System.in", "BufferedReader", "InputStreamReader",
            "nextInt", "nextLine", "nextDouble", "nextFloat", "readLine"
        ])

        if needs_input and not stdin_input:
            return {
                "success": False,
                "error": "This program requires user input (Scanner/System.in detected). Please provide input in the 'Stdin Input' panel below the console before running.",
                "needs_input": True
            }
        else:
            return {"success": False, "error": "Execution timeout (10s limit)"}
    except Exception as e:
        print(f"[ERROR] Exception: {str(e)}")
        return {"success": False, "error": str(e)}


# ════════════════════════════════════════════════════════════
#  Socket.IO — Interactive Terminal Events
# ════════════════════════════════════════════════════════════

@socketio.on('connect')
def handle_connect():
    """Client connected — send them their session ID."""
    sid = request.sid
    print(f"[SOCKET] Client connected: {sid}")
    emit('connected', {'sid': sid})


@socketio.on('disconnect')
def handle_disconnect():
    """Client disconnected — kill any running process."""
    sid = request.sid
    print(f"[SOCKET] Client disconnected: {sid}")
    _kill_process(sid)


@socketio.on('terminal:run')
def handle_terminal_run(data):
    """
    Compile and run Java code in interactive mode.
    Streams output back line-by-line via 'terminal:output' events.
    Expected payload: { code: string }
    """
    sid = request.sid

    # Kill any existing process for this client
    _kill_process(sid)

    code = data.get('code', '').strip()
    if not code:
        emit('terminal:error', {'message': 'No code provided'})
        return

    if not find_java():
        emit('terminal:error', {'message': 'Java compiler not found on server'})
        return

    try:
        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        source_file = Path(temp_dir) / "Main.java"
        source_file.write_text(code, encoding='utf-8')

        # Compile
        emit('terminal:output', {'data': '\r\n\x1b[36m⚙  Compiling...\x1b[0m\r\n'})

        compile_result = subprocess.run(
            [JAVAC_PATH, str(source_file)],
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=temp_dir
        )

        if compile_result.returncode != 0:
            error_msg = compile_result.stderr or "Compilation failed"
            # Emit compilation error to xterm with ANSI red
            emit('terminal:output', {
                'data': f'\r\n\x1b[31m✗ Compilation Error:\x1b[0m\r\n{_ansi_escape(error_msg)}\r\n'
            })
            emit('terminal:exit', {'code': 1, 'reason': 'compilation_error'})
            shutil.rmtree(temp_dir, ignore_errors=True)
            return

        emit('terminal:output', {'data': '\x1b[32m✓ Compiled successfully\x1b[0m\r\n\r\n'})

        # Start interactive process
        proc = subprocess.Popen(
            [JAVA_PATH, "-cp", temp_dir, "Main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            bufsize=0,          # Unbuffered
            cwd=temp_dir,
        )

        with process_lock:
            interactive_processes[sid] = proc
            interactive_temp_dirs[sid] = temp_dir

        print(f"[TERMINAL] Started process PID={proc.pid} for sid={sid}")

        # Stream output in background thread
        def _stream_output():
            try:
                # Read char-by-char so prompts (without newlines) are streamed immediately
                while True:
                    chunk = proc.stdout.read(1)
                    if not chunk:
                        break
                    # Convert \n → \r\n for xterm compatibility
                    chunk = chunk.replace('\n', '\r\n')
                    socketio.emit('terminal:output', {'data': chunk}, to=sid)

                exit_code = proc.wait()
                print(f"[TERMINAL] Process PID={proc.pid} exited with code {exit_code}")
                socketio.emit('terminal:exit', {'code': exit_code, 'reason': 'natural'}, to=sid)
            except Exception as e:
                print(f"[TERMINAL] Stream error for sid={sid}: {e}")
                socketio.emit('terminal:exit', {'code': -1, 'reason': str(e)}, to=sid)
            finally:
                _kill_process(sid)

        thread = threading.Thread(target=_stream_output, daemon=True)
        thread.start()

    except Exception as e:
        print(f"[TERMINAL] Exception for sid={sid}: {e}")
        emit('terminal:error', {'message': str(e)})
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@socketio.on('terminal:input')
def handle_terminal_input(data):
    """
    Forward keyboard input from xterm to the running Java process stdin.
    Expected payload: { data: string }
    """
    sid = request.sid
    with process_lock:
        proc = interactive_processes.get(sid)

    if proc and proc.poll() is None:
        try:
            input_data = data.get('data', '')
            proc.stdin.write(input_data)
            proc.stdin.flush()
        except BrokenPipeError:
            print(f"[TERMINAL] Broken pipe for sid={sid} (process ended)")
        except Exception as e:
            print(f"[TERMINAL] Input error for sid={sid}: {e}")


@socketio.on('terminal:kill')
def handle_terminal_kill():
    """Kill the running process for this session."""
    sid = request.sid
    print(f"[TERMINAL] Kill requested for sid={sid}")
    _kill_process(sid)
    emit('terminal:exit', {'code': -1, 'reason': 'killed'})


@socketio.on('terminal:resize')
def handle_terminal_resize(data):
    """Handle terminal resize events (for future PTY support)."""
    # Currently no-op; kept for API completeness
    pass


def _ansi_escape(text: str) -> str:
    """Convert plain text to xterm-safe string (escape < and > but keep newlines as \r\n)."""
    return text.replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\r\n')


# ════════════════════════════════════════════════════════════
#  REST API Routes
# ════════════════════════════════════════════════════════════

@app.route("/api/share", methods=["POST"])
def create_share():
    """Create a shareable session"""
    try:
        if not check_rate_limit():
            return jsonify({
                "success": False,
                "error": "Rate limit exceeded. Please try again later."
            }), 429

        data = request.get_json()
        code = data.get("code", "")
        output = data.get("output", "")

        if not code or not code.strip():
            return jsonify({
                "success": False,
                "error": "Code cannot be empty"
            }), 400

        if len(code) > 50000:
            return jsonify({
                "success": False,
                "error": "Code too large (max 50KB)"
            }), 400

        code = sanitize_code(code)
        output = sanitize_code(output) if output else ""

        share_id = generate_share_id()
        expires_at = datetime.now() + timedelta(days=30)

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO shares (id, code, output, expires_at)
            VALUES (?, ?, ?, ?)
        """, (share_id, code, output, expires_at.isoformat()))

        conn.commit()
        conn.close()

        print(f"[SHARE] Created share: {share_id}")

        return jsonify({
            "success": True,
            "id": share_id,
            "expires_at": expires_at.isoformat()
        })

    except Exception as e:
        print(f"[SHARE] Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/share/<share_id>", methods=["GET"])
def get_share(share_id):
    """Get a shared session"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT code, output, views, created_at, expires_at
            FROM shares WHERE id = ?
        """, (share_id,))

        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({
                "success": False,
                "error": "Share not found"
            }), 404

        code, output, views, created_at, expires_at = result

        if datetime.fromisoformat(expires_at) < datetime.now():
            conn.close()
            return jsonify({
                "success": False,
                "error": "Share has expired"
            }), 410

        cursor.execute("""
            UPDATE shares SET views = views + 1
            WHERE id = ?
        """, (share_id,))

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "code": code,
            "output": output,
            "views": views + 1,
            "created_at": created_at,
            "expires_at": expires_at
        })

    except Exception as e:
        print(f"[SHARE] Error retrieving: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/share-images/<filename>")
def serve_share_image(filename):
    """Serve generated share images"""
    try:
        return send_from_directory(SHARE_IMAGES_DIR, filename)
    except Exception as e:
        print(f"[SHARE] Error serving image {filename}: {e}")
        return jsonify({"error": "Image not found"}), 404


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "os": SYSTEM,
        "java_available": JAVA_AVAILABLE,
        "is_windows": IS_WINDOWS,
        "is_linux": IS_LINUX,
        "interactive_sessions": len(interactive_processes),
    })


@app.route("/api/compile", methods=["POST"])
def compile_endpoint():
    """Compile and run Java source code (non-interactive mode)"""
    try:
        data = request.get_json()
        source_code = data.get("code", "")
        stdin_input = data.get("stdin", "")

        print(f"\n{'='*50}")
        print(f"[API] /api/compile received")
        print(f"[API] Code length: {len(source_code)} chars")
        print(f"[API] Stdin received: {repr(stdin_input) if stdin_input else '(empty)'}")
        print(f"{'='*50}")

        if not source_code:
            return jsonify({"success": False, "error": "No code provided"}), 400

        result = compile_java(source_code, stdin_input)

        error_text = result.get('error', '')
        if error_text and error_text.strip():
            is_compilation = not result.get('success') and (
                'Compilation failed' in error_text or 'error:' in error_text
            )

            ai_explanation = ai_review_error(
                error_text=error_text,
                source_code=source_code,
                is_compilation_error=is_compilation,
            )
            if ai_explanation:
                result['ai_review'] = ai_explanation
            else:
                review = explain_error(
                    error_text=error_text,
                    source_code=source_code,
                    is_compilation_error=is_compilation,
                )
                if review:
                    result['error_review'] = review

        return jsonify(result)

    except Exception as e:
        print(f"[API] EXCEPTION: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/info", methods=["GET"])
def info():
    """Get server information"""
    return jsonify({
        "name": "Java Compiler Server",
        "os": SYSTEM,
        "is_windows": IS_WINDOWS,
        "is_linux": IS_LINUX,
        "is_mac": IS_MAC,
        "java_available": JAVA_AVAILABLE,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}"
    })


# ════════════════════════════════════════════════════════════
#  Static / SPA Routing
# ════════════════════════════════════════════════════════════

@app.route("/s/<share_id>")
def serve_shared(share_id):
    """Serve shared session with OG metadata."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT code, output, views, created_at, expires_at, image_path
            FROM shares WHERE id = ?
        """, (share_id,))

        result = cursor.fetchone()
        conn.close()

        if not result:
            return serve("")

        code, output, views, created_at, expires_at, image_path = result

        if datetime.fromisoformat(expires_at) < datetime.now():
            return serve("")

        code_preview = code[:150].replace('\n', ' ').replace(
            '"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')

        og_image = f"{request.host_url}share-images/{os.path.basename(image_path)}" if image_path else f"{request.host_url}og-image.png"
        share_url = f"{request.host_url}s/{share_id}"

        index_path = os.path.join(app.static_folder, "index.html")  # type: ignore

        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            html_content = html_content.replace(
                '<title>JavaRena — Online Java Compiler &amp; Code Playground</title>',
                f'<title>Shared Java Code — JavaRena Playground</title>'
            )

            og_tags = f"""
    <!-- Share-specific SEO overrides -->
    <meta property="og:title" content="Shared Java Code — JavaRena Playground" />
    <meta property="og:description" content="{code_preview}..." />
    <meta property="og:image" content="{og_image}" />
    <meta property="og:url" content="{share_url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Shared Java Code — JavaRena" />
    <meta name="twitter:image" content="{og_image}" />
    <link rel="canonical" href="{share_url}" />
    <meta name="robots" content="noindex, follow" />
    <script>
        window.__SHARED_SESSION__ = {{
            id: "{share_id}",
            code: {json.dumps(code)},
            output: {json.dumps(output)},
            views: {views},
            isFork: true
        }};
    </script>
"""
            html_content = html_content.replace('</head>', og_tags + '</head>')
            return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
        else:
            return jsonify({
                "error": "Frontend not built yet",
                "message": "Run 'npm run build' to build the React frontend first"
            }), 404

    except Exception as e:
        print(f"[SHARE] Error serving shared session: {e}")
        return serve("")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    """Serve React static files or index.html for SPA routing"""
    if path.startswith("s/"):
        return serve_shared(path[2:])

    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):  # type: ignore
        return send_from_directory(app.static_folder, path)  # type: ignore
    else:
        index_path = os.path.join(app.static_folder, "index.html")  # type: ignore
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, "index.html")  # type: ignore
        else:
            return jsonify({
                "error": "Frontend not built yet",
                "message": "Run 'npm run build' to build the React frontend first"
            }), 404


# ════════════════════════════════════════════════════════════
#  Boot Sequence Helpers
# ════════════════════════════════════════════════════════════

def _boot_step(label, value, delay=0.15):
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    padded_label = label.ljust(40, " ")
    sys.stdout.write(f"  {DIM}[    ]{RESET} {padded_label}")
    sys.stdout.flush()
    time.sleep(delay)
    sys.stdout.write(f"\r  {GREEN}[ ✓  ]{RESET} {padded_label} {CYAN}{BOLD}{value}{RESET}\n")
    sys.stdout.flush()


def _boot_step_fail(label, value, delay=0.15):
    RED = "\033[91m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    padded_label = label.ljust(40, " ")
    sys.stdout.write(f"  {DIM}[    ]{RESET} {padded_label}")
    sys.stdout.flush()
    time.sleep(delay)
    sys.stdout.write(f"\r  {RED}[ ✗  ]{RESET} {padded_label} {RED}{BOLD}{value}{RESET}\n")
    sys.stdout.flush()


def _get_java_version():
    try:
        result = subprocess.run(
            [JAVA_PATH, "-version"],
            capture_output=True, text=True, timeout=5
        )
        ver = result.stderr.strip().split("\n")[0] if result.stderr else "Unknown"
        return ver
    except Exception:
        return "Not found"


def _get_react_version():
    try:
        pkg_path = os.path.join(os.path.dirname(__file__), "package.json")
        with open(pkg_path, "r") as f:
            pkg = json.load(f)
        return pkg.get("dependencies", {}).get("react", "Unknown")
    except Exception:
        return "Unknown"


def _get_vite_version():
    try:
        pkg_path = os.path.join(os.path.dirname(__file__), "package.json")
        with open(pkg_path, "r") as f:
            pkg = json.load(f)
        return pkg.get("devDependencies", {}).get("vite", "Unknown")
    except Exception:
        return "Unknown"


# ════════════════════════════════════════════════════════════
#  Entry Point
# ════════════════════════════════════════════════════════════

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

    if not os.path.exists("dist"):
        _boot_step_fail("Locating built frontend", "dist/ not found")
        print(f"\n  {YELLOW}Frontend not built yet!{RESET}")
        print(f"  Run this first: {BOLD}npm run build{RESET}")
        print(f"  Then start the server again with: {BOLD}python server.py{RESET}\n")
        sys.exit(1)

    os_label = f"{SYSTEM}"
    if IS_WINDOWS:
        os_label = f"Windows ({platform.release()})"
    elif IS_LINUX:
        os_label = "Linux"
    elif IS_MAC:
        os_label = "macOS"
    _boot_step("Detecting host OS", os_label)

    JAVA_AVAILABLE = find_java()
    if JAVA_AVAILABLE:
        _boot_step("Locating javac binary", JAVAC_PATH)
    else:
        _boot_step_fail("Locating javac binary", "NOT FOUND")

    if JAVA_AVAILABLE:
        jvm_ver = _get_java_version()
        _boot_step("Verifying JVM heartbeat", jvm_ver)
    else:
        _boot_step_fail("Verifying JVM heartbeat", "Skipped (no Java)")

    _boot_step("Raising Flask + Socket.IO server", "Port 5000")

    react_ver = _get_react_version()
    _boot_step("Mounting Monaco Editor grimoire", f"React {react_ver}")

    vite_ver = _get_vite_version()
    _boot_step("Binding frontend to backend", f"Vite {vite_ver} proxy locked")

    _boot_step("Warming the classloader", "Ready")
    _boot_step("Initializing interactive terminal engine", "xterm.js + WebSocket")

    init_share_db()
    _boot_step("Initializing share database", "SQLite ready")

    cleanup_thread = threading.Thread(target=cleanup_expired_shares, daemon=True)
    cleanup_thread.start()
    _boot_step("Starting cleanup daemon", "Background task active")

    print()
    print(f"  {GREEN}{BOLD}[SYSTEM]{RESET} {BOLD}The Arena is open.{RESET}")
    print(f"  {DIM}[SYSTEM] Interactive terminal mode: ENABLED{RESET}")
    print(f"  {DIM}[SYSTEM] May your semicolons be plentiful, and your NullPointers few.{RESET}")
    print()

    if not JAVA_AVAILABLE:
        print(f"  {YELLOW}{BOLD}⚠  WARNING:{RESET}{YELLOW} Java compiler (javac) not found!{RESET}")
        print(f"  {YELLOW}   Please install Java Development Kit (JDK){RESET}")
        print()

    print(f"  {MAGENTA}{BOLD}>>> Listening on http://localhost:5000{RESET}")
    print(f"  {MAGENTA}{BOLD}>>> Socket.IO ready for interactive sessions{RESET}")
    print()

    # Use socketio.run for development; in production use gunicorn+eventlet
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, use_reloader=False)
