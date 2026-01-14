import { existsSync } from "fs";
import { join } from "path";
function getConfigDir() {
  if (existsSync("/app/config")) {
    return "/app/config";
  }
  const devPath = join(process.cwd(), "..", "config");
  if (existsSync(devPath)) {
    return devPath;
  }
  return "/app/config";
}
const CONFIG_DIR = getConfigDir();
const SYSTEM_STATUS_FILE = join(CONFIG_DIR, "system-status.json");
const DOWNLOAD_REQUEST_FILE = join(CONFIG_DIR, "download-model.request");
const DOWNLOAD_STATUS_FILE = join(CONFIG_DIR, "download-model.status");
const SWITCH_MODEL_REQUEST_FILE = join(CONFIG_DIR, "switch-model.request");
const SWITCH_MODEL_STATUS_FILE = join(CONFIG_DIR, "switch-model.status");
const CURRENT_MODEL_FILE = join(CONFIG_DIR, "current-model");
const SERVERS_CONFIG_FILE = join(CONFIG_DIR, "servers.json");
export {
  CONFIG_DIR as C,
  DOWNLOAD_STATUS_FILE as D,
  SERVERS_CONFIG_FILE as S,
  DOWNLOAD_REQUEST_FILE as a,
  CURRENT_MODEL_FILE as b,
  SYSTEM_STATUS_FILE as c,
  SWITCH_MODEL_STATUS_FILE as d,
  SWITCH_MODEL_REQUEST_FILE as e
};
