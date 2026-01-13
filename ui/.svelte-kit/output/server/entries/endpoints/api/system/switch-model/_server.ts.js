import { json } from "@sveltejs/kit";
import { existsSync, readFileSync, writeFileSync } from "fs";
const REQUEST_FILE = "/app/config/switch-model.request";
const STATUS_FILE = "/app/config/switch-model.status";
const GET = async () => {
  try {
    if (!existsSync(STATUS_FILE)) {
      return json({ status: { status: "idle", message: "No switch in progress", model: "", timestamp: 0 } });
    }
    const content = readFileSync(STATUS_FILE, "utf-8");
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
    writeFileSync(REQUEST_FILE, model, "utf-8");
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
