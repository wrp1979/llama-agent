#!/usr/bin/env python3
"""
System status server for llama-agent.
Exposes system information (GPU, RAM, disk, models) via HTTP.
"""

import http.server
import json
import os
import subprocess
import threading
import time
from pathlib import Path

STATUS_PORT = int(os.environ.get('STATUS_PORT', '8082'))
MODELS_DIR = os.environ.get('MODELS_DIR', '/models')
UPDATE_INTERVAL = 5  # seconds

# Cached status
_status_cache = {}
_cache_lock = threading.Lock()


def get_gpu_info():
    """Get GPU information via nvidia-smi."""
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu',
             '--format=csv,noheader,nounits'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(', ')
            if len(parts) >= 6:
                return {
                    'name': parts[0],
                    'memory_total_mb': int(parts[1]),
                    'memory_used_mb': int(parts[2]),
                    'memory_free_mb': int(parts[3]),
                    'utilization_percent': int(parts[4]),
                    'temperature_c': int(parts[5]),
                }
    except Exception as e:
        print(f"GPU info error: {e}")
    return None


def get_memory_info():
    """Get system memory information."""
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = {}
            for line in f:
                parts = line.split(':')
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip().split()[0]  # Get number only
                    meminfo[key] = int(value) // 1024  # Convert KB to MB

            return {
                'total_mb': meminfo.get('MemTotal', 0),
                'free_mb': meminfo.get('MemFree', 0),
                'available_mb': meminfo.get('MemAvailable', 0),
                'used_mb': meminfo.get('MemTotal', 0) - meminfo.get('MemAvailable', 0),
            }
    except Exception as e:
        print(f"Memory info error: {e}")
    return None


def get_disk_info():
    """Get disk space information for models directory."""
    try:
        result = subprocess.run(
            ['df', '-B1', MODELS_DIR],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 2:
                parts = lines[1].split()
                if len(parts) >= 4:
                    return {
                        'total_gb': int(parts[1]) / (1024**3),
                        'used_gb': int(parts[2]) / (1024**3),
                        'available_gb': int(parts[3]) / (1024**3),
                        'mount_point': parts[5] if len(parts) > 5 else MODELS_DIR,
                    }
    except Exception as e:
        print(f"Disk info error: {e}")
    return None


def get_models_info():
    """Get list of available GGUF models."""
    models = []
    try:
        models_path = Path(MODELS_DIR)
        if models_path.exists():
            for f in models_path.glob('*.gguf'):
                stat = f.stat()
                models.append({
                    'name': f.name,
                    'size_gb': stat.st_size / (1024**3),
                    'modified': stat.st_mtime,
                })
            # Sort by modification time (most recent first)
            models.sort(key=lambda x: x['modified'], reverse=True)
    except Exception as e:
        print(f"Models info error: {e}")
    return models


def get_active_model():
    """Get the currently loaded model (from environment or process)."""
    # Check environment variable first
    model_path = os.environ.get('MODEL_PATH', '')
    if model_path:
        return Path(model_path).name

    # Try to find from process
    try:
        result = subprocess.run(
            ['pgrep', '-a', 'llama-agent-server'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            # Parse -m argument
            for arg in result.stdout.split():
                if arg.endswith('.gguf'):
                    return Path(arg).name
    except:
        pass

    return None


def update_status():
    """Update the status cache."""
    global _status_cache
    status = {
        'timestamp': time.time(),
        'gpu': get_gpu_info(),
        'memory': get_memory_info(),
        'disk': get_disk_info(),
        'models': get_models_info(),
        'active_model': get_active_model(),
    }
    with _cache_lock:
        _status_cache = status


def status_updater():
    """Background thread to update status periodically."""
    while True:
        try:
            update_status()
        except Exception as e:
            print(f"Status update error: {e}")
        time.sleep(UPDATE_INTERVAL)


class StatusHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler for status requests."""

    def log_message(self, format, *args):
        # Suppress access logs
        pass

    def do_GET(self):
        if self.path == '/status' or self.path == '/':
            with _cache_lock:
                status = _status_cache.copy()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(status, indent=2).encode())

        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')

        else:
            self.send_response(404)
            self.end_headers()


def main():
    # Initial status update
    update_status()

    # Start background updater
    updater_thread = threading.Thread(target=status_updater, daemon=True)
    updater_thread.start()

    # Start HTTP server
    server = http.server.HTTPServer(('0.0.0.0', STATUS_PORT), StatusHandler)
    print(f"System status server running on port {STATUS_PORT}")
    server.serve_forever()


if __name__ == '__main__':
    main()
