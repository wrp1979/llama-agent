#!/bin/bash
# Model Manager - monitors for model switch requests and restarts the server
# This script runs in background and watches /config/switch-model.request

set -e

MODEL_DIR="${MODELS_DIR:-/models}"
CONFIG_DIR="/config"
REQUEST_FILE="${CONFIG_DIR}/switch-model.request"
STATUS_FILE="${CONFIG_DIR}/switch-model.status"
CURRENT_MODEL_FILE="${CONFIG_DIR}/current-model"
API_KEY_FILE="${CONFIG_DIR}/local-api-key"

SERVER_HOST="${LLAMA_ARG_HOST:-0.0.0.0}"
SERVER_PORT="${LLAMA_ARG_PORT:-8081}"
SERVER_PID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${CYAN}[model-manager]${NC} $1"
}

error() {
    echo -e "${RED}[model-manager]${NC} $1"
}

success() {
    echo -e "${GREEN}[model-manager]${NC} $1"
}

write_status() {
    local status="$1"
    local message="$2"
    local model="$3"
    echo "{\"status\":\"$status\",\"message\":\"$message\",\"model\":\"$model\",\"timestamp\":$(date +%s)}" > "$STATUS_FILE"
}

get_api_key() {
    if [ -f "$API_KEY_FILE" ]; then
        cat "$API_KEY_FILE"
    else
        echo ""
    fi
}

# Calculate recommended GPU layers based on model size and available VRAM
# Returns "auto" to let llama.cpp decide, or a specific number
calculate_gpu_layers() {
    local model_path="$1"

    # For now, use "auto" which lets llama.cpp auto-detect the best setting
    # This is the safest option and works well with modern llama.cpp
    echo "auto"
}

start_server() {
    local model_name="$1"
    local model_path="${MODEL_DIR}/${model_name}"
    local api_key=$(get_api_key)

    if [ ! -f "$model_path" ]; then
        error "Model not found: $model_path"
        write_status "error" "Model not found: $model_name" "$model_name"
        return 1
    fi

    log "Starting server with model: $model_name"
    write_status "loading" "Loading model..." "$model_name"

    # Calculate optimal GPU layers based on model size and available VRAM
    local gpu_layers=$(calculate_gpu_layers "$model_path")

    # Save current model
    echo "$model_name" > "$CURRENT_MODEL_FILE"

    # Context size - use LLAMA_CTX_SIZE env var or auto-detect from model
    local ctx_size="${LLAMA_CTX_SIZE:-}"

    if [ -z "$ctx_size" ]; then
        # Auto-detect from model file
        ctx_size=$(python3 /app/get-model-context.py "$model_path" 8192 2>/dev/null || echo 8192)
        log "Using auto-detected context: $ctx_size tokens"
    else
        log "Using configured context: $ctx_size tokens (LLAMA_CTX_SIZE)"
    fi

    # Build server command
    local cmd="./llama-agent-server -m $model_path --host $SERVER_HOST --port $SERVER_PORT -ngl $gpu_layers -c $ctx_size"

    if [ -n "$api_key" ]; then
        cmd="$cmd --api-key $api_key"
    fi

    # Start server in background
    $cmd &
    SERVER_PID=$!

    # Wait for server to be ready (check health endpoint)
    local max_wait=300  # 5 minutes max for large models
    local waited=0
    while [ $waited -lt $max_wait ]; do
        sleep 2
        waited=$((waited + 2))

        # Check if process is still running
        if ! kill -0 $SERVER_PID 2>/dev/null; then
            error "Server process died"
            write_status "error" "Server failed to start" "$model_name"
            return 1
        fi

        # Check health endpoint
        if curl -s -f "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
            success "Server ready with model: $model_name"
            write_status "ready" "Model loaded successfully" "$model_name"
            return 0
        fi

        # Show progress every 30 seconds
        if [ $((waited % 30)) -eq 0 ]; then
            log "Still loading... (${waited}s)"
        fi
    done

    error "Timeout waiting for server to be ready"
    write_status "error" "Timeout loading model" "$model_name"
    return 1
}

stop_server() {
    if [ -n "$SERVER_PID" ] && kill -0 $SERVER_PID 2>/dev/null; then
        log "Stopping server (PID: $SERVER_PID)"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        SERVER_PID=""
    fi

    # Also kill any other llama-agent-server processes
    pkill -f "llama-agent-server" 2>/dev/null || true
    sleep 2
}

switch_model() {
    local new_model="$1"

    log "Switching to model: $new_model"
    write_status "switching" "Stopping current model..." "$new_model"

    stop_server

    if start_server "$new_model"; then
        success "Model switched to: $new_model"
        return 0
    else
        error "Failed to switch model"
        return 1
    fi
}

watch_for_requests() {
    log "Watching for model switch requests..."

    while true; do
        if [ -f "$REQUEST_FILE" ]; then
            local requested_model=$(cat "$REQUEST_FILE")
            rm -f "$REQUEST_FILE"

            if [ -n "$requested_model" ]; then
                switch_model "$requested_model"
            fi
        fi
        sleep 1
    done
}

# Main entry point
main() {
    local initial_model="$1"

    log "Model Manager starting..."

    # Clean up any existing request files
    rm -f "$REQUEST_FILE"

    # Start initial model
    if [ -n "$initial_model" ]; then
        if ! start_server "$initial_model"; then
            error "Failed to start initial model"
            exit 1
        fi
    fi

    # Watch for switch requests
    watch_for_requests
}

# Handle signals
trap 'stop_server; exit 0' SIGTERM SIGINT

# Run main with initial model from argument or environment
main "${1:-$MODEL_NAME}"
