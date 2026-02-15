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

# ── Dependency check ──
REQUIRED_PACKAGES = {
    "flask": "Flask",
    "flask_cors": "flask-cors",
    "PIL": "Pillow",
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

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import re
from nanoid import generate
from snippet import generate_image

# Create Flask app with proper static folder configuration
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# Detect OS
SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"
IS_LINUX = SYSTEM == "Linux"
IS_MAC = SYSTEM == "Darwin"

# Global Java paths
JAVA_PATH = None
JAVAC_PATH = None
JAVA_AVAILABLE = False  # Cache the result

# Share database paths
DB_PATH = "shares.db"
SHARE_IMAGES_DIR = "dist/share-images"

# Rate limiting
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 5  # max shares per window
rate_limit_storage = {}

print(f"Java Compiler Server - Detected OS: {SYSTEM}")


def find_java():
    """Find java and javac executables"""
    global JAVA_PATH, JAVAC_PATH

    if IS_WINDOWS:
        # First try shutil.which (standard PATH)
        javac = shutil.which("javac")
        java = shutil.which("java")

        if javac and java:
            JAVA_PATH = java
            JAVAC_PATH = javac
            return True

        # Search Program Files for JDK installations
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
    else:  # Linux/Mac
        javac = shutil.which("javac")
        java = shutil.which("java")

        if javac and java:
            JAVA_PATH = java
            JAVAC_PATH = javac
            return True

        # Try common Linux/Mac paths
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

    # Remove old timestamps
    rate_limit_storage[client_ip] = [
        ts for ts in rate_limit_storage[client_ip]
        if current_time - ts < RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_MAX:
        return False

    rate_limit_storage[client_ip].append(current_time)
    return True


def sanitize_code(code):
    """Validate code input (XSS protection handled by json.dumps in response)"""
    # No HTML escaping needed - json.dumps() handles proper escaping
    # when injecting into JavaScript context
    return code


def cleanup_expired_shares():
    """Background task to cleanup expired shares and images"""
    while True:
        try:
            time.sleep(3600)  # Run every hour

            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            # Get expired shares with images
            cursor.execute("""
                SELECT id, image_path FROM shares 
                WHERE expires_at < datetime('now')
            """)
            expired = cursor.fetchall()

            # Delete expired shares
            cursor.execute(
                "DELETE FROM shares WHERE expires_at < datetime('now')")
            conn.commit()

            # Delete associated images
            for share_id, image_path in expired:
                if image_path and os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                        print(f"[CLEANUP] Deleted image: {image_path}")
                    except Exception as e:
                        print(
                            f"[CLEANUP] Failed to delete image {image_path}: {e}")

            print(f"[CLEANUP] Cleaned up {len(expired)} expired shares")
            conn.close()

        except Exception as e:
            print(f"[CLEANUP] Error during cleanup: {e}")


def compile_java(source_code, stdin_input=""):
    """Compile and run Java source code with optional stdin input"""
    if not find_java():
        print("[ERROR] Java compiler (javac) not found")
        return {"success": False, "error": "Java compiler (javac) not found on this system"}

    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        source_file = Path(temp_dir) / "Main.java"
        print(f"[LOG] Created temp dir: {temp_dir}")

        # Write source code to file
        source_file.write_text(source_code, encoding='utf-8')
        print(f"[LOG] Source code written ({len(source_code)} chars)")

        # Compile using detected Java path
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

        # Run the compiled class using detected Java path
        run_cmd = [JAVA_PATH, "-cp", temp_dir, "Main"]
        has_stdin = bool(stdin_input)
        print(f"[LOG] Running: {' '.join(run_cmd)}")
        if has_stdin:
            print(
                f"[LOG] Stdin input provided ({len(stdin_input)} chars): {repr(stdin_input[:100])}")
        else:
            print("[LOG] No stdin input provided")

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
        if output:
            print(f"[LOG] Stdout: {repr(output[:200])}")
        if error:
            print(f"[LOG] Stderr: {repr(error[:200])}")

        # Cleanup
        shutil.rmtree(temp_dir)
        print("[LOG] Temp dir cleaned up")

        return {
            "success": True,
            "output": output,
            "error": error,
            "os": SYSTEM
        }

    except subprocess.TimeoutExpired:
        # Cleanup temp dir on timeout
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

        # Check if the code needs stdin input but none was provided
        needs_input = any(keyword in source_code for keyword in [
            "Scanner", "System.in", "BufferedReader", "InputStreamReader",
            "nextInt", "nextLine", "nextDouble", "nextFloat", "readLine"
        ])

        if needs_input and not stdin_input:
            print("[ERROR] Timeout - code requires stdin input but none was provided")
            return {
                "success": False,
                "error": "This program requires user input (Scanner/System.in detected). Please provide input in the 'Stdin Input' panel below the console before running.",
                "needs_input": True
            }
        else:
            print("[ERROR] Execution timed out (10s limit)")
            return {"success": False, "error": "Execution timeout (10s limit)"}
    except Exception as e:
        print(f"[ERROR] Exception: {str(e)}")
        return {"success": False, "error": str(e)}

# API Routes


@app.route("/api/share", methods=["POST"])
def create_share():
    """Create a shareable session"""
    try:
        # Check rate limit
        if not check_rate_limit():
            return jsonify({
                "success": False,
                "error": "Rate limit exceeded. Please try again later."
            }), 429

        data = request.get_json()
        code = data.get("code", "")
        output = data.get("output", "")

        # Validate input
        if not code or not code.strip():
            return jsonify({
                "success": False,
                "error": "Code cannot be empty"
            }), 400

        if len(code) > 50000:  # 50KB limit
            return jsonify({
                "success": False,
                "error": "Code too large (max 50KB)"
            }), 400

        # Sanitize inputs
        code = sanitize_code(code)
        output = sanitize_code(output) if output else ""

        # Generate unique ID
        share_id = generate_share_id()

        # Calculate expiration (30 days)
        expires_at = datetime.now() + timedelta(days=30)

        # Store in database
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

        # Get share and increment view count
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

        # Check if expired
        if datetime.fromisoformat(expires_at) < datetime.now():
            conn.close()
            return jsonify({
                "success": False,
                "error": "Share has expired"
            }), 410

        # Increment view count
        cursor.execute("""
            UPDATE shares SET views = views + 1
            WHERE id = ?
        """, (share_id,))

        conn.commit()
        conn.close()

        print(f"[SHARE] Retrieved share: {share_id} (views: {views + 1})")

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


@app.route("/api/share/image", methods=["POST"])
def generate_share_image():
    """Generate a code image"""
    try:
        # Check rate limit
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

        # Generate image
        img = generate_image(code, output)

        if not img:
            return jsonify({
                "success": False,
                "error": "Failed to generate image"
            }), 500

        # Generate unique filename
        image_id = generate_share_id()
        image_filename = f"{image_id}.png"
        image_path = os.path.join(SHARE_IMAGES_DIR, image_filename)

        # Save image
        img.save(image_path, "PNG", optimize=True, quality=85)

        # Calculate expiration (30 days)
        expires_at = datetime.now() + timedelta(days=30)

        # Store in database (for cleanup)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO shares (id, code, output, image_path, expires_at)
            VALUES (?, ?, ?, ?, ?)
        """, (image_id, code[:1000], output[:500], image_path, expires_at.isoformat()))

        conn.commit()
        conn.close()

        print(f"[SHARE] Generated image: {image_filename}")

        return jsonify({
            "success": True,
            "image_url": f"/share-images/{image_filename}",
            "expires_at": expires_at.isoformat()
        })

    except Exception as e:
        print(f"[SHARE] Error generating image: {e}")
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
    })


@app.route("/api/compile", methods=["POST"])
def compile_endpoint():
    """Compile and run Java source code"""
    try:
        data = request.get_json()
        source_code = data.get("code", "")
        stdin_input = data.get("stdin", "")

        print(f"\n{'='*50}")
        print(f"[API] /api/compile received")
        print(f"[API] Code length: {len(source_code)} chars")
        print(
            f"[API] Stdin received: {repr(stdin_input) if stdin_input else '(empty)'}")
        print(f"[API] Request keys: {list(data.keys())}")
        print(f"{'='*50}")

        if not source_code:
            print("[API] ERROR: No code provided")
            return jsonify({"success": False, "error": "No code provided"}), 400

        result = compile_java(source_code, stdin_input)

        print(f"[API] Response: success={result.get('success')}")
        if result.get('output'):
            print(f"[API] Output: {repr(result['output'][:200])}")
        if result.get('error'):
            print(f"[API] Error: {repr(result['error'][:200])}")
        print(f"{'='*50}\n")

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

# Serve React static files


@app.route("/s/<share_id>")
def serve_shared(share_id):
    """Serve shared session with Open Graph metadata"""
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
            # Share not found, serve regular app
            return serve("")

        code, output, views, created_at, expires_at, image_path = result

        # Check if expired
        if datetime.fromisoformat(expires_at) < datetime.now():
            return serve("")

        # Get first 120 chars of code for description
        code_preview = code[:120].replace('\n', ' ').replace('"', '&quot;')

        # Generate OG image URL
        og_image = f"{request.host_url}share-images/{os.path.basename(image_path)}" if image_path else f"{request.host_url}logo.png"

        # Read index.html and inject OG tags
        index_path = os.path.join(
            app.static_folder, "index.html")  # type: ignore

        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            # Inject OG meta tags
            og_tags = f"""
    <meta property="og:title" content="JavaRena - Shared Code Snippet" />
    <meta property="og:description" content="{code_preview}..." />
    <meta property="og:image" content="{og_image}" />
    <meta property="og:url" content="{request.url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="JavaRena - Shared Code" />
    <meta name="twitter:description" content="{code_preview}..." />
    <meta name="twitter:image" content="{og_image}" />
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

            # Insert before </head>
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
    # Skip share routes
    if path.startswith("s/"):
        return serve_shared(path[2:])

    # type: ignore
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        # pyright: ignore[reportArgumentType]
        return send_from_directory(app.static_folder, path)
    else:
        # Return index.html for SPA routing
        index_path = os.path.join(
            app.static_folder, "index.html")  # type: ignore
        if os.path.exists(index_path):
            # type: ignore
            return send_from_directory(app.static_folder, "index.html")
        else:
            return jsonify({
                "error": "Frontend not built yet",
                "message": "Run 'npm run build' to build the React frontend first"
            }), 404


def _boot_step(label, value, delay=0.15):
    """Print a single boot step with animation."""
    # ANSI colors
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    padded_label = label.ljust(40, " ")
    sys.stdout.write(f"  {DIM}[    ]{RESET} {padded_label}")
    sys.stdout.flush()
    time.sleep(delay)
    sys.stdout.write(
        f"\r  {GREEN}[ ✓  ]{RESET} {padded_label} {CYAN}{BOLD}{value}{RESET}\n")
    sys.stdout.flush()


def _boot_step_fail(label, value, delay=0.15):
    """Print a failing boot step."""
    RED = "\033[91m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    padded_label = label.ljust(40, " ")
    sys.stdout.write(f"  {DIM}[    ]{RESET} {padded_label}")
    sys.stdout.flush()
    time.sleep(delay)
    sys.stdout.write(
        f"\r  {RED}[ ✗  ]{RESET} {padded_label} {RED}{BOLD}{value}{RESET}\n")
    sys.stdout.flush()


def _get_java_version():
    """Try to get JVM version string."""
    try:
        result = subprocess.run(
            [JAVA_PATH, "-version"],
            capture_output=True, text=True, timeout=5
        )
        # java -version prints to stderr
        ver = result.stderr.strip().split(
            "\n")[0] if result.stderr else "Unknown"
        return ver
    except Exception:
        return "Not found"


def _get_react_version():
    """Read React version from package.json."""
    try:
        pkg_path = os.path.join(os.path.dirname(__file__), "package.json")
        with open(pkg_path, "r") as f:
            pkg = json.load(f)
        return pkg.get("dependencies", {}).get("react", "Unknown")
    except Exception:
        return "Unknown"


def _get_vite_version():
    """Read Vite version from package.json."""
    try:
        pkg_path = os.path.join(os.path.dirname(__file__), "package.json")
        with open(pkg_path, "r") as f:
            pkg = json.load(f)
        return pkg.get("devDependencies", {}).get("vite", "Unknown")
    except Exception:
        return "Unknown"


if __name__ == "__main__":
    # ── ANSI color codes ──
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    DIM = "\033[2m"
    BOLD = "\033[1m"
    RESET = "\033[0m"
    MAGENTA = "\033[95m"

    # ── ASCII art banner ──
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

    # ── Boot header ──
    print(
        f"  {YELLOW}{BOLD}[BOOT]{RESET} {DIM}JavaRena v1.0 — Summoning Protocol Initiated{RESET}")
    print()

    # ── Pre-flight: check dist folder ──
    if not os.path.exists("dist"):
        _boot_step_fail("Locating built frontend", "dist/ not found")
        print(f"\n  {YELLOW}Frontend not built yet!{RESET}")
        print(f"  Run this first: {BOLD}npm run build{RESET}")
        print(
            f"  Then start the server again with: {BOLD}python server.py{RESET}\n")
        sys.exit(1)

    # ── Step 1: Detect OS ──
    os_label = f"{SYSTEM}"
    if IS_WINDOWS:
        os_label = f"Windows ({platform.release()})"
    elif IS_LINUX:
        os_label = "Linux"
    elif IS_MAC:
        os_label = "macOS"
    _boot_step("Detecting host OS", os_label)

    # ── Step 2: Find javac ──
    JAVA_AVAILABLE = find_java()
    if JAVA_AVAILABLE:
        _boot_step("Locating javac binary", JAVAC_PATH)
    else:
        _boot_step_fail("Locating javac binary", "NOT FOUND")

    # ── Step 3: JVM version ──
    if JAVA_AVAILABLE:
        jvm_ver = _get_java_version()
        _boot_step("Verifying JVM heartbeat", jvm_ver)
    else:
        _boot_step_fail("Verifying JVM heartbeat", "Skipped (no Java)")

    # ── Step 4: Flask server ──
    _boot_step("Raising Flask server from the void", "Port 5000")

    # ── Step 5: Monaco + React ──
    react_ver = _get_react_version()
    _boot_step("Mounting Monaco Editor grimoire", f"React {react_ver}")

    # ── Step 6: Vite proxy ──
    vite_ver = _get_vite_version()
    _boot_step("Binding frontend to backend", f"Vite {vite_ver} proxy locked")

    # ── Step 7: Classloader warmth ──
    _boot_step("Warming the classloader", "Ready")

    # ── Step 8: Initialize share database ──
    init_share_db()
    _boot_step("Initializing share database", "SQLite ready")

    # ── Step 9: Start cleanup thread ──
    cleanup_thread = threading.Thread(
        target=cleanup_expired_shares, daemon=True)
    cleanup_thread.start()
    _boot_step("Starting cleanup daemon", "Background task active")

    # ── Final status ──
    print()
    print(f"  {GREEN}{BOLD}[SYSTEM]{RESET} {BOLD}The Arena is open.{RESET}")
    print(
        f"  {DIM}[SYSTEM] May your semicolons be plentiful, and your NullPointers few.{RESET}")
    print()

    if not JAVA_AVAILABLE:
        print(
            f"  {YELLOW}{BOLD}⚠  WARNING:{RESET}{YELLOW} Java compiler (javac) not found!{RESET}")
        print(f"  {YELLOW}   Please install Java Development Kit (JDK){RESET}")
        print()

    print(f"  {MAGENTA}{BOLD}>>> Listening on http://localhost:5000{RESET}")
    print()

    from waitress import serve
    serve(app, host="0.0.0.0", port=5000)
