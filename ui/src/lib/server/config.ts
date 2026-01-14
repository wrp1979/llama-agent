import { existsSync } from 'fs';
import { join } from 'path';

// Config directory detection
// In Docker: /app/config
// In dev mode: ../config (relative to project root)
function getConfigDir(): string {
  // Check Docker path first
  if (existsSync('/app/config')) {
    return '/app/config';
  }

  // Check relative path (dev mode)
  const devPath = join(process.cwd(), '..', 'config');
  if (existsSync(devPath)) {
    return devPath;
  }

  // Fallback to Docker path (will fail gracefully)
  return '/app/config';
}

export const CONFIG_DIR = getConfigDir();

// Config file paths
export const SYSTEM_STATUS_FILE = join(CONFIG_DIR, 'system-status.json');
export const DOWNLOAD_REQUEST_FILE = join(CONFIG_DIR, 'download-model.request');
export const DOWNLOAD_STATUS_FILE = join(CONFIG_DIR, 'download-model.status');
export const SWITCH_MODEL_REQUEST_FILE = join(CONFIG_DIR, 'switch-model.request');
export const SWITCH_MODEL_STATUS_FILE = join(CONFIG_DIR, 'switch-model.status');
export const CURRENT_MODEL_FILE = join(CONFIG_DIR, 'current-model');
export const SERVERS_CONFIG_FILE = join(CONFIG_DIR, 'servers.json');
