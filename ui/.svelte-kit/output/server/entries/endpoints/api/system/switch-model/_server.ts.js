import { json } from "@sveltejs/kit";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { d as SWITCH_MODEL_STATUS_FILE, C as CONFIG_DIR, e as SWITCH_MODEL_REQUEST_FILE } from "../../../../../chunks/config.js";
const GET = async () => {
  try {
    if (!existsSync(SWITCH_MODEL_STATUS_FILE)) {
      return json({ status: { status: "idle", message: "No switch in progress", model: "", timestamp: 0 } });
    }
    const content = readFileSync(SWITCH_MODEL_STATUS_FILE, "utf-8");
    const status = JSON.parse(content);
    return json({ status });
  } catch (error) {
    console.error("Failed to read switch status:", error);
    return json({ status: { status: "idle", message: "Unknown", model: "", timestamp: 0 } });
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { model } = body;
    if (!model) {
      return json({ error: "Model name is required" }, { status: 400 });
    }
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(SWITCH_MODEL_REQUEST_FILE, model, "utf-8");
    return json({ success: true, message: `Requested switch to ${model}` });
  } catch (error) {
    console.error("Failed to request model switch:", error);
    return json({ error: "Failed to request model switch" }, { status: 500 });
  }
};
export {
  GET,
  POST
};
