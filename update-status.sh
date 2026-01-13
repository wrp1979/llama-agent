#!/bin/bash
# Generate system status JSON file
# Run this periodically via cron or background loop

STATUS_FILE="/config/system-status.json"
MODELS_DIR="${MODELS_DIR:-/models}"
MODEL_PATH="${MODEL_PATH:-}"

# Get GPU info
gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
gpu_mem_total=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
gpu_mem_used=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1)
gpu_mem_free=$(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | head -1)
gpu_util=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)
gpu_temp=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1)

if [ -n "$gpu_name" ]; then
    gpu_json=$(cat <<EOF
{
    "name": "$gpu_name",
    "memory_total_mb": ${gpu_mem_total:-0},
    "memory_used_mb": ${gpu_mem_used:-0},
    "memory_free_mb": ${gpu_mem_free:-0},
    "utilization_percent": ${gpu_util:-0},
    "temperature_c": ${gpu_temp:-0}
}
EOF
)
else
    gpu_json="null"
fi

# Get memory info
mem_total=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024)}')
mem_free=$(grep MemFree /proc/meminfo | awk '{print int($2/1024)}')
mem_available=$(grep MemAvailable /proc/meminfo | awk '{print int($2/1024)}')
mem_used=$((mem_total - mem_available))

# Get disk info
disk_info=$(df -B1 "$MODELS_DIR" | tail -1)
disk_total=$(echo "$disk_info" | awk '{printf "%.2f", $2/1073741824}')
disk_used=$(echo "$disk_info" | awk '{printf "%.2f", $3/1073741824}')
disk_available=$(echo "$disk_info" | awk '{printf "%.2f", $4/1073741824}')

# Get models list
models_json="["
first=true
for model in "$MODELS_DIR"/*.gguf; do
    if [ -f "$model" ]; then
        name=$(basename "$model")
        size=$(stat -c %s "$model" 2>/dev/null || echo 0)
        # Calculate size in GB using awk
        size_gb=$(echo "$size" | awk '{printf "%.2f", $1 / 1073741824}')
        mtime=$(stat -c %Y "$model" 2>/dev/null || echo 0)

        # Skip small test files (< 100MB)
        if [ "$size" -lt 100000000 ]; then
            continue
        fi

        if [ "$first" = true ]; then
            first=false
        else
            models_json+=","
        fi
        models_json+="{\"name\":\"$name\",\"size_gb\":$size_gb,\"modified\":$mtime}"
    fi
done
models_json+="]"

# Get active model
active_model=""
if [ -n "$MODEL_PATH" ]; then
    active_model=$(basename "$MODEL_PATH")
fi

# Generate JSON
cat > "$STATUS_FILE" <<EOF
{
  "timestamp": $(date +%s),
  "gpu": $gpu_json,
  "memory": {
    "total_mb": $mem_total,
    "free_mb": $mem_free,
    "available_mb": $mem_available,
    "used_mb": $mem_used
  },
  "disk": {
    "total_gb": $disk_total,
    "used_gb": $disk_used,
    "available_gb": $disk_available,
    "mount_point": "$MODELS_DIR"
  },
  "models": $models_json,
  "active_model": $([ -n "$active_model" ] && echo "\"$active_model\"" || echo "null")
}
EOF

echo "Status updated: $STATUS_FILE"
