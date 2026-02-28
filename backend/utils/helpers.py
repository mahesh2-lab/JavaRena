import sys
import time
import subprocess

def _ansi_escape(text: str) -> str:
    """Convert plain text to xterm-safe string (escape < and > but keep newlines as \r\n)."""
    return text.replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\r\n')

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

def get_java_version(java_path):
    if not java_path:
        return "Not found"
    try:
        result = subprocess.run(
            [java_path, "-version"],
            capture_output=True, text=True, timeout=5
        )
        ver = result.stderr.strip().split("\n")[0] if result.stderr else "Unknown"
        return ver
    except Exception:
        return "Not found"
