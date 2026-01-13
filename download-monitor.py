#!/usr/bin/env python3
"""
Monitor de download que captura progresso do huggingface-cli
e expõe via HTTP para a UI.
"""

import json
import os
import re
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

STATUS_FILE = "/models/.download-status.json"
STATUS_PORT = 8081

status = {
    "status": "idle",
    "model": "",
    "message": "",
    "progress": 0,
    "downloaded": "",
    "total": "",
    "speed": "",
    "eta": "",
    "timestamp": ""
}

class StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/status" or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def log_message(self, format, *args):
        pass  # Silence logs

def start_status_server():
    server = HTTPServer(("0.0.0.0", STATUS_PORT), StatusHandler)
    server.serve_forever()

def update_status(**kwargs):
    global status
    status.update(kwargs)
    status["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")

    # Also write to file for persistence
    try:
        with open(STATUS_FILE, "w") as f:
            json.dump(status, f)
    except:
        pass

def parse_progress_line(line):
    """Parse huggingface-cli download progress line."""
    # Format: "filename:  45% 21.8G/48.5G [05:23<06:32, 68.1MB/s]"
    match = re.search(
        r'(\d+)%\s+([\d.]+[KMGT]?B?)\s*/\s*([\d.]+[KMGT]?B?)\s*'
        r'\[([^\]]+)\]',
        line
    )
    if match:
        return {
            "progress": int(match.group(1)),
            "downloaded": match.group(2),
            "total": match.group(3),
            "time_info": match.group(4)
        }
    return None

def run_download(repo, filename, local_dir):
    """Run huggingface-cli download and capture progress."""
    update_status(
        status="downloading",
        model=filename,
        message="Starting download...",
        progress=0
    )

    cmd = [
        "huggingface-cli", "download",
        repo, filename,
        "--local-dir", local_dir,
        "--local-dir-use-symlinks", "False"
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1
    )

    for line in process.stdout:
        line = line.strip()
        print(line, flush=True)  # Echo to console

        progress = parse_progress_line(line)
        if progress:
            # Parse time info for ETA and speed
            time_parts = progress["time_info"].split(",")
            eta = time_parts[0].strip() if len(time_parts) > 0 else ""
            speed = time_parts[1].strip() if len(time_parts) > 1 else ""

            update_status(
                status="downloading",
                model=filename,
                message=f"Downloading: {progress['progress']}%",
                progress=progress["progress"],
                downloaded=progress["downloaded"],
                total=progress["total"],
                speed=speed,
                eta=eta
            )

    process.wait()

    if process.returncode == 0:
        model_path = os.path.join(local_dir, filename)
        if os.path.exists(model_path):
            update_status(
                status="ready",
                model=filename,
                message="Download complete!",
                progress=100
            )
            return True

    update_status(
        status="error",
        model=filename,
        message="Download failed",
        progress=0
    )
    return False

def main():
    if len(sys.argv) < 4:
        print("Usage: download-monitor.py <repo> <filename> <local_dir>")
        sys.exit(1)

    repo = sys.argv[1]
    filename = sys.argv[2]
    local_dir = sys.argv[3]

    # Start HTTP server in background
    server_thread = threading.Thread(target=start_status_server, daemon=True)
    server_thread.start()
    print(f"Status server running on port {STATUS_PORT}")

    # Check if model already exists
    model_path = os.path.join(local_dir, filename)
    if os.path.exists(model_path):
        size = os.path.getsize(model_path)
        size_gb = size / (1024**3)
        update_status(
            status="ready",
            model=filename,
            message=f"Model ready ({size_gb:.1f}GB)",
            progress=100
        )
        print(f"Model already exists: {model_path}")
        # Keep server running
        while True:
            time.sleep(60)

    # Run download
    success = run_download(repo, filename, local_dir)

    if success:
        # Keep server running after download
        while True:
            time.sleep(60)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
