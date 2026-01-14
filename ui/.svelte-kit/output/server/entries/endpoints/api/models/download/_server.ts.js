import { json } from "@sveltejs/kit";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { D as DOWNLOAD_STATUS_FILE, C as CONFIG_DIR, a as DOWNLOAD_REQUEST_FILE } from "../../../../../chunks/config.js";
const GET = async () => {
  try {
    if (!existsSync(DOWNLOAD_STATUS_FILE)) {
      return json({
        status: {
          status: "idle",
          repoId: "",
          filename: "",
          progress: 0,
          speed: "",
          eta: "",
          message: "No download in progress",
          timestamp: 0
        }
      });
    }
    const content = readFileSync(DOWNLOAD_STATUS_FILE, "utf-8");
    const status = JSON.parse(content);
    return json({ status });
  } catch (error) {
    console.error("Failed to read download status:", error);
    return json({
      status: {
        status: "idle",
        repoId: "",
        filename: "",
        progress: 0,
        speed: "",
        eta: "",
        message: "Unknown",
        timestamp: 0
      }
    });
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { repoId, filename } = body;
    if (!repoId || !filename) {
      return json({ error: "repoId and filename are required" }, { status: 400 });
    }
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const requestData = JSON.stringify({ repoId, filename });
    writeFileSync(DOWNLOAD_REQUEST_FILE, requestData, "utf-8");
    return json({ success: true, message: `Requested download of ${filename} from ${repoId}` });
  } catch (error) {
    console.error("Failed to request download:", error);
    return json({ error: "Failed to request download" }, { status: 500 });
  }
};
const DELETE = async () => {
  try {
    writeFileSync(DOWNLOAD_REQUEST_FILE, JSON.stringify({ cancel: true }), "utf-8");
    return json({ success: true, message: "Download cancel requested" });
  } catch (error) {
    console.error("Failed to cancel download:", error);
    return json({ error: "Failed to cancel download" }, { status: 500 });
  }
};
export {
  DELETE,
  GET,
  POST
};
