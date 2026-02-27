# ══════════════════════════════════════════════════════════
#  Java Code Arena — Production Dockerfile
#  All-in-one: Node.js + Python + Java (JDK) on Linux
# ══════════════════════════════════════════════════════════

# ── Stage 1: Build the React/Vite frontend ──────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (cache layer)
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* ./

# Use npm ci if lock exists, otherwise npm install
RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
    npm ci; \
    else \
    npm install; \
    fi

# Copy everything from frontend and build
COPY frontend/ ./

RUN npm run build


# ── Stage 2: Production runtime ─────────────────────────
FROM debian:bookworm-slim AS runtime

# Prevent interactive prompts during install
ENV DEBIAN_FRONTEND=noninteractive

# ── Install ALL dependencies ────────────────────────────
# Python 3 + pip + Java JDK + utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python
    python3 \
    python3-pip \
    python3-venv \
    # Java (JDK — includes javac compiler + java runtime)
    default-jdk \
    # Node.js (for any runtime JS if needed)
    curl \
    ca-certificates \
    # Utilities
    procps \
    && rm -rf /var/lib/apt/lists/*

# ── Install Node.js 20.x (from NodeSource) ─────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* && apt install git

# ── Verify all runtimes are available ───────────────────
RUN echo "=== Runtime Versions ===" && \
    echo "Python: $(python3 --version)" && \
    echo "Node.js: $(node --version)" && \
    echo "npm: $(npm --version)" && \
    echo "Java: $(java -version 2>&1 | head -1)" && \
    echo "javac: $(javac -version 2>&1)" && \
    echo "========================"

# ── Set up application directory ────────────────────────
WORKDIR /app

# ── Install Python dependencies ─────────────────────────
# Copy Python dependency files from backend
COPY backend/pyproject.toml backend/requirements.txt ./

# Create virtual environment and install dependencies
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy the Python server files ────────────────────────
COPY backend/*.py ./
# Copy shares.db if it exists (though usually it should be a volume)
# COPY backend/shares.db ./

# ── Copy the built frontend from Stage 1 ────────────────
COPY --from=frontend-builder /app/frontend/dist ./dist

# ── Environment variables ───────────────────────────────
# OPENROUTER_API_KEY should be passed at runtime via docker-compose or docker run -e
ENV OPENROUTER_API_KEY=""

# ── Expose the server port ──────────────────────────────
EXPOSE 5000

# ── Health check ────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# ── Start the server ────────────────────────────────────
CMD ["python3", "server.py"]
