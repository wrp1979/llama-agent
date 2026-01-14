#!/usr/bin/env python3
"""
Download Manager for llama-agent.
Monitors for download requests and downloads models from Hugging Face.
"""

import json
import os
import sys
import time

import requests

try:
    from huggingface_hub import HfApi, hf_hub_url
    from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError
except ImportError:
    print("Installing huggingface_hub...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub", "-q"])
    from huggingface_hub import HfApi, hf_hub_url
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


def download_with_progress(url: str, dest_path: str, repo_id: str, filename: str, total_size: int) -> bool:
    """Download file with progress tracking using requests streaming."""
    global cancel_requested

    start_time = time.time()
    downloaded = 0
    last_update = 0

    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        # Get size from headers if not provided
        if total_size == 0:
            total_size = int(response.headers.get('content-length', 0))

        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                if cancel_requested:
                    raise KeyboardInterrupt("Download cancelled")

                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    # Update status every 0.5 seconds
                    now = time.time()
                    if now - last_update >= 0.5:
                        last_update = now
                        elapsed = now - start_time

                        # Calculate progress
                        progress = (downloaded / total_size * 100) if total_size > 0 else 0

                        # Calculate speed
                        speed_bytes = downloaded / elapsed if elapsed > 0 else 0
                        if speed_bytes >= 1e6:
                            speed = f"{speed_bytes / 1e6:.1f} MB/s"
                        else:
                            speed = f"{speed_bytes / 1e3:.1f} KB/s"

                        # Calculate ETA
                        if speed_bytes > 0 and total_size > 0:
                            remaining = total_size - downloaded
                            eta_seconds = remaining / speed_bytes
                            if eta_seconds < 60:
                                eta = f"{int(eta_seconds)}s"
                            elif eta_seconds < 3600:
                                eta = f"{int(eta_seconds / 60)}m {int(eta_seconds % 60)}s"
                            else:
                                eta = f"{int(eta_seconds / 3600)}h {int((eta_seconds % 3600) / 60)}m"
                        else:
                            eta = "calculating..."

                        # Format sizes
                        if downloaded >= 1e9:
                            dl_str = f"{downloaded / 1e9:.2f} GB"
                        else:
                            dl_str = f"{downloaded / 1e6:.1f} MB"

                        if total_size >= 1e9:
                            total_str = f"{total_size / 1e9:.2f} GB"
                        else:
                            total_str = f"{total_size / 1e6:.1f} MB"

                        write_status(
                            'downloading', repo_id, filename,
                            progress, speed, eta,
                            f"Downloading: {dl_str} / {total_str}"
                        )

        return True

    except requests.exceptions.RequestException as e:
        print(f"Download error: {e}")
        return False


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

        # Get download URL from HuggingFace
        url = hf_hub_url(repo_id=repo_id, filename=filename)
        print(f"Download URL: {url}")

        # Download with progress
        dest_path = os.path.join(MODELS_DIR, filename)

        if not download_with_progress(url, dest_path, repo_id, filename, total_size):
            raise Exception("Download failed")

        print(f"Download complete: {dest_path}")
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
