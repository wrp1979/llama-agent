#!/usr/bin/env python3
"""
Download Manager for llama-agent.
Monitors for download requests and downloads models from Hugging Face.
"""

import json
import os
import sys
import time
import threading
from pathlib import Path

try:
    from huggingface_hub import hf_hub_download, HfApi
    from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError
except ImportError:
    print("Installing huggingface_hub...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub", "-q"])
    from huggingface_hub import hf_hub_download, HfApi
    from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError

CONFIG_DIR = os.environ.get('CONFIG_DIR', '/config')
MODELS_DIR = os.environ.get('MODELS_DIR', '/models')
REQUEST_FILE = os.path.join(CONFIG_DIR, 'download-model.request')
STATUS_FILE = os.path.join(CONFIG_DIR, 'download-model.status')

# Global state
current_download = None
cancel_requested = False


def write_status(status: str, repo_id: str = '', filename: str = '',
                 progress: float = 0, speed: str = '', eta: str = '', message: str = ''):
    """Write download status to file."""
    data = {
        'status': status,
        'repoId': repo_id,
        'filename': filename,
        'progress': progress,
        'speed': speed,
        'eta': eta,
        'message': message,
        'timestamp': int(time.time())
    }
    try:
        with open(STATUS_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Failed to write status: {e}")


class DownloadProgressCallback:
    """Track download progress."""

    def __init__(self, repo_id: str, filename: str, total_size: int = 0):
        self.repo_id = repo_id
        self.filename = filename
        self.total_size = total_size
        self.downloaded = 0
        self.start_time = time.time()
        self.last_update = 0

    def __call__(self, chunk_size: int):
        global cancel_requested

        self.downloaded += chunk_size
        now = time.time()

        # Update status every 0.5 seconds
        if now - self.last_update < 0.5:
            return

        self.last_update = now
        elapsed = now - self.start_time

        # Calculate progress
        if self.total_size > 0:
            progress = (self.downloaded / self.total_size) * 100
        else:
            progress = 0

        # Calculate speed
        if elapsed > 0:
            speed_bytes = self.downloaded / elapsed
            if speed_bytes >= 1e6:
                speed = f"{speed_bytes / 1e6:.1f} MB/s"
            else:
                speed = f"{speed_bytes / 1e3:.1f} KB/s"

            # Calculate ETA
            if speed_bytes > 0 and self.total_size > 0:
                remaining = self.total_size - self.downloaded
                eta_seconds = remaining / speed_bytes
                if eta_seconds < 60:
                    eta = f"{int(eta_seconds)}s"
                elif eta_seconds < 3600:
                    eta = f"{int(eta_seconds / 60)}m {int(eta_seconds % 60)}s"
                else:
                    eta = f"{int(eta_seconds / 3600)}h {int((eta_seconds % 3600) / 60)}m"
            else:
                eta = "calculating..."
        else:
            speed = "calculating..."
            eta = "calculating..."

        # Format downloaded size
        if self.downloaded >= 1e9:
            downloaded_str = f"{self.downloaded / 1e9:.2f} GB"
        elif self.downloaded >= 1e6:
            downloaded_str = f"{self.downloaded / 1e6:.1f} MB"
        else:
            downloaded_str = f"{self.downloaded / 1e3:.1f} KB"

        # Format total size
        if self.total_size >= 1e9:
            total_str = f"{self.total_size / 1e9:.2f} GB"
        elif self.total_size >= 1e6:
            total_str = f"{self.total_size / 1e6:.1f} MB"
        else:
            total_str = f"{self.total_size / 1e3:.1f} KB"

        message = f"Downloading: {downloaded_str} / {total_str}"

        write_status(
            'downloading',
            self.repo_id,
            self.filename,
            progress,
            speed,
            eta,
            message
        )

        # Check for cancel
        if cancel_requested:
            raise KeyboardInterrupt("Download cancelled by user")


def get_file_size(repo_id: str, filename: str) -> int:
    """Get file size from HuggingFace."""
    try:
        api = HfApi()
        info = api.model_info(repo_id, files_metadata=True)
        for sibling in info.siblings:
            if sibling.rfilename == filename:
                return sibling.size or 0
    except Exception as e:
        print(f"Failed to get file size: {e}")
    return 0


def download_model(repo_id: str, filename: str) -> bool:
    """Download a model file from Hugging Face."""
    global cancel_requested
    cancel_requested = False

    print(f"Starting download: {repo_id}/{filename}")
    write_status('downloading', repo_id, filename, 0, '', '', 'Starting download...')

    try:
        # Get file size first
        total_size = get_file_size(repo_id, filename)
        print(f"File size: {total_size / 1e9:.2f} GB")

        # Create progress callback
        progress_callback = DownloadProgressCallback(repo_id, filename, total_size)

        # Download the file
        local_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=MODELS_DIR,
            local_dir_use_symlinks=False,
        )

        # Move to models root if in subdirectory
        final_path = os.path.join(MODELS_DIR, filename)
        if local_path != final_path:
            import shutil
            shutil.move(local_path, final_path)
            # Clean up empty directories
            try:
                subdir = os.path.dirname(local_path)
                if subdir != MODELS_DIR:
                    os.removedirs(subdir)
            except:
                pass

        print(f"Download complete: {final_path}")
        write_status('completed', repo_id, filename, 100, '', '', f'Download complete: {filename}')
        return True

    except KeyboardInterrupt:
        print("Download cancelled")
        write_status('error', repo_id, filename, 0, '', '', 'Download cancelled')
        return False

    except RepositoryNotFoundError:
        print(f"Repository not found: {repo_id}")
        write_status('error', repo_id, filename, 0, '', '', f'Repository not found: {repo_id}')
        return False

    except EntryNotFoundError:
        print(f"File not found: {filename}")
        write_status('error', repo_id, filename, 0, '', '', f'File not found: {filename}')
        return False

    except Exception as e:
        print(f"Download failed: {e}")
        write_status('error', repo_id, filename, 0, '', '', f'Download failed: {str(e)[:100]}')
        return False


def watch_for_requests():
    """Watch for download requests."""
    global cancel_requested

    print("Download Manager started, watching for requests...")
    write_status('idle', '', '', 0, '', '', 'Ready')

    while True:
        try:
            if os.path.exists(REQUEST_FILE):
                with open(REQUEST_FILE, 'r') as f:
                    request = json.load(f)

                # Remove request file
                os.remove(REQUEST_FILE)

                if request.get('cancel'):
                    print("Cancel requested")
                    cancel_requested = True
                elif request.get('repoId') and request.get('filename'):
                    download_model(request['repoId'], request['filename'])

        except json.JSONDecodeError:
            print("Invalid request file")
        except Exception as e:
            print(f"Error processing request: {e}")

        time.sleep(1)


def main():
    """Main entry point."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(CONFIG_DIR, exist_ok=True)

    # Clean up old request file
    if os.path.exists(REQUEST_FILE):
        os.remove(REQUEST_FILE)

    watch_for_requests()


if __name__ == '__main__':
    main()
