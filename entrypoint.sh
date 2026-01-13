#!/usr/bin/env bash
set -e

MODEL_DIR="/models"
MODEL_NAME="Qwen3-Next-80B-A3B-Instruct-Q4_K_M.gguf"
MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"
HF_REPO="unsloth/Qwen3-Next-80B-A3B-Instruct-GGUF"
STATUS_FILE="${MODEL_DIR}/.download-status.json"
SERVER_HOST="${LLAMA_ARG_HOST:-0.0.0.0}"
SERVER_PORT="${LLAMA_ARG_PORT:-8080}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              llama-agent container starting                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

mkdir -p "${MODEL_DIR}"

# Function to update status file
update_status() {
    local status="$1"
    local message="$2"
    local progress="$3"
    echo "{\"status\":\"${status}\",\"model\":\"${MODEL_NAME}\",\"message\":\"${message}\",\"progress\":${progress:-0},\"timestamp\":\"$(date -Iseconds)\"}" > "${STATUS_FILE}"
}

# Function to download model in background
download_model() {
    update_status "downloading" "Starting download..." 0

    echo -e "${YELLOW}⚠ Model not found locally${NC}"
    echo ""
    echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│  DOWNLOADING MODEL IN BACKGROUND                           │${NC}"
    echo -e "${BLUE}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}│  Model: ${NC}${MODEL_NAME}"
    echo -e "${BLUE}│  Repo:  ${NC}${HF_REPO}"
    echo -e "${BLUE}│  Size:  ${NC}~48.5 GB"
    echo -e "${BLUE}│                                                            │${NC}"
    echo -e "${BLUE}│  ${GREEN}Server is running - check UI for progress${BLUE}              │${NC}"
    echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Download with hf CLI
    if huggingface-cli download "${HF_REPO}" "${MODEL_NAME}" \
        --local-dir "${MODEL_DIR}" \
        --local-dir-use-symlinks False 2>&1; then

        if [ -f "${MODEL_PATH}" ]; then
            update_status "loading" "Download complete, loading model..." 100
            echo -e "${GREEN}✓ Download complete!${NC}"

            # Load the model via API
            echo -e "${CYAN}Loading model into server...${NC}"
            sleep 2  # Wait for server to be ready

            curl -s -X POST "http://127.0.0.1:${SERVER_PORT}/models" \
                -H "Content-Type: application/json" \
                -d "{\"model\": \"${MODEL_PATH}\"}" || true

            update_status "ready" "Model loaded and ready" 100
            echo -e "${GREEN}✓ Model loaded!${NC}"
        else
            update_status "error" "Download failed - file not found" 0
            echo -e "${RED}✗ Download failed!${NC}"
        fi
    else
        update_status "error" "Download failed" 0
        echo -e "${RED}✗ Download failed!${NC}"
    fi
}

# Check if model exists
if [ -f "${MODEL_PATH}" ]; then
    size=$(du -h "${MODEL_PATH}" | cut -f1)
    echo -e "${GREEN}✓ Model found: ${MODEL_NAME} (${size})${NC}"
    update_status "ready" "Model available" 100

    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  STARTING LLAMA SERVER                                     │${NC}"
    echo -e "${CYAN}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│  Host: ${NC}${SERVER_HOST}:${SERVER_PORT}"
    echo -e "${CYAN}│  GPU Layers: ${NC}${LLAMA_ARG_N_GPU_LAYERS:-999}"
    echo -e "${CYAN}│  Model: ${NC}${MODEL_NAME}"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Start server with model
    exec ./llama-server \
        -m "${MODEL_PATH}" \
        --host "${SERVER_HOST}" \
        --port "${SERVER_PORT}" \
        -ngl "${LLAMA_ARG_N_GPU_LAYERS:-999}" \
        "$@"
else
    # Start download in background
    download_model &
    DOWNLOAD_PID=$!

    echo ""
    echo -e "${CYAN}┌────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  STARTING LLAMA SERVER (Router Mode)                       │${NC}"
    echo -e "${CYAN}├────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│  Host: ${NC}${SERVER_HOST}:${SERVER_PORT}"
    echo -e "${CYAN}│  Mode: ${NC}Router (model downloading in background)"
    echo -e "${CYAN}└────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Start server in router mode (no model)
    ./llama-server \
        --host "${SERVER_HOST}" \
        --port "${SERVER_PORT}" \
        "$@" &
    SERVER_PID=$!

    # Wait for either process to exit
    wait $DOWNLOAD_PID 2>/dev/null || true
    wait $SERVER_PID
fi
