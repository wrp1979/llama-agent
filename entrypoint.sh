#!/usr/bin/env bash
set -e

MODEL_DIR="/models"
MODEL_NAME="Qwen3-Next-80B-A3B-Instruct-Q4_K_M.gguf"
MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"
HF_REPO="unsloth/Qwen3-Next-80B-A3B-Instruct-GGUF"
STATUS_FILE="${MODEL_DIR}/.download-status.json"
SERVER_HOST="${LLAMA_ARG_HOST:-0.0.0.0}"
SERVER_PORT="${LLAMA_ARG_PORT:-8081}"

# Config directory for API keys
CONFIG_DIR="/config"
API_KEY_FILE="${CONFIG_DIR}/local-api-key"
SERVERS_FILE="${CONFIG_DIR}/servers.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           llama-agent-server container starting            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

mkdir -p "${MODEL_DIR}"
mkdir -p "${CONFIG_DIR}"

# ============================================================================
# API Key Management
# ============================================================================
if [ -f "${API_KEY_FILE}" ]; then
    API_KEY=$(cat "${API_KEY_FILE}")
    echo -e "${GREEN}✓ Using existing API key${NC}"
else
    API_KEY="sk-local-$(openssl rand -hex 16)"
    echo "${API_KEY}" > "${API_KEY_FILE}"
    chmod 600 "${API_KEY_FILE}"
    echo -e "${GREEN}✓ Generated new API key${NC}"
fi

# Register local server in servers.json (for UI auto-discovery)
if [ ! -f "${SERVERS_FILE}" ]; then
    cat > "${SERVERS_FILE}" << EOF
{
  "servers": [
    {
      "id": "local",
      "name": "Local Agent",
      "url": "http://localhost:8081",
      "apiKey": "${API_KEY}",
      "isLocal": true,
      "autoConnect": true
    }
  ],
  "activeServerId": "local"
}
EOF
    chmod 644 "${SERVERS_FILE}"
    echo -e "${GREEN}✓ Created servers.json${NC}"
else
    # Update API key in existing servers.json if local entry exists
    if command -v jq &> /dev/null; then
        TEMP_FILE=$(mktemp)
        jq --arg key "${API_KEY}" '
          .servers = [.servers[] | if .id == "local" then .apiKey = $key else . end]
        ' "${SERVERS_FILE}" > "${TEMP_FILE}" && mv "${TEMP_FILE}" "${SERVERS_FILE}"
        echo -e "${GREEN}✓ Updated API key in servers.json${NC}"
    fi
fi

echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  API KEY INFORMATION                                       │${NC}"
echo -e "${BLUE}├────────────────────────────────────────────────────────────┤${NC}"
echo -e "${BLUE}│  Key File: ${NC}${API_KEY_FILE}"
echo -e "${BLUE}│  Key:      ${NC}${API_KEY:0:20}..."
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""

# ============================================================================
# Model Check and Server Start
# ============================================================================
if [ -f "${MODEL_PATH}" ]; then
    size=$(du -h "${MODEL_PATH}" | cut -f1)
    echo -e "${GREEN}✓ Model found: ${MODEL_NAME} (${size})${NC}"

    # Write ready status
    echo "{\"status\":\"ready\",\"model\":\"${MODEL_NAME}\",\"message\":\"Model ready (${size})\",\"progress\":100}" > "${STATUS_FILE}"

    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  STARTING LLAMA-AGENT-SERVER                               │${NC}"
    echo -e "${CYAN}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│  Host: ${NC}${SERVER_HOST}:${SERVER_PORT}"
    echo -e "${CYAN}│  GPU Layers: ${NC}${LLAMA_ARG_N_GPU_LAYERS:-999}"
    echo -e "${CYAN}│  Model: ${NC}${MODEL_NAME}"
    echo -e "${CYAN}│  API: ${NC}http://localhost:${SERVER_PORT}/v1/agent"
    echo -e "${CYAN}│  Auth: ${NC}API Key enabled"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Start llama-agent-server with model AND API key
    exec ./llama-agent-server \
        -m "${MODEL_PATH}" \
        --host "${SERVER_HOST}" \
        --port "${SERVER_PORT}" \
        --api-key "${API_KEY}" \
        -ngl "${LLAMA_ARG_N_GPU_LAYERS:-999}" \
        "$@"
else
    echo -e "${YELLOW}⚠ Model not found locally${NC}"
    echo ""
    echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  DOWNLOADING MODEL                                         │${NC}"
    echo -e "${BLUE}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}│  Model: ${NC}${MODEL_NAME}"
    echo -e "${BLUE}│  Repo:  ${NC}${HF_REPO}"
    echo -e "${BLUE}│  Size:  ${NC}~48.5 GB"
    echo -e "${BLUE}│                                                            │${NC}"
    echo -e "${BLUE}│  ${GREEN}Progress available at :8082/status${BLUE}                      │${NC}"
    echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Start download monitor in background (exposes status on port 8082)
    STATUS_PORT=8082 python3 /app/download-monitor.py "${HF_REPO}" "${MODEL_NAME}" "${MODEL_DIR}" &
    MONITOR_PID=$!

    # Wait a bit for the status server to start
    sleep 2

    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  WAITING FOR MODEL DOWNLOAD                                │${NC}"
    echo -e "${CYAN}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│  Download Status: ${NC}http://localhost:8082/status"
    echo -e "${CYAN}│  Agent API will start after download completes             │${NC}"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Wait for download to complete
    wait $MONITOR_PID 2>/dev/null
    MONITOR_EXIT=$?

    # If download succeeded, start the server
    if [ $MONITOR_EXIT -eq 0 ] && [ -f "${MODEL_PATH}" ]; then
        echo -e "${GREEN}✓ Download complete, starting llama-agent-server...${NC}"
        sleep 2

        exec ./llama-agent-server \
            -m "${MODEL_PATH}" \
            --host "${SERVER_HOST}" \
            --port "${SERVER_PORT}" \
            --api-key "${API_KEY}" \
            -ngl "${LLAMA_ARG_N_GPU_LAYERS:-999}" \
            "$@"
    else
        echo -e "${RED}✗ Download failed${NC}"
        exit 1
    fi
fi
