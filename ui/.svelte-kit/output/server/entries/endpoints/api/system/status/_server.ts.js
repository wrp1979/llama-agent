import { json } from "@sveltejs/kit";
import { existsSync, readFileSync } from "fs";
import { c as SYSTEM_STATUS_FILE } from "../../../../../chunks/config.js";
const GET = async () => {
  try {
    if (!existsSync(SYSTEM_STATUS_FILE)) {
      return json({ error: "Status file not found", status: null }, { status: 404 });
    }
    const content = readFileSync(SYSTEM_STATUS_FILE, "utf-8");
    const status = JSON.parse(content);
    const age = Date.now() / 1e3 - status.timestamp;
    const isStale = age > 30;
    return json({ status, age, isStale });
  } catch (error) {
    console.error("Failed to read system status:", error);
    return json({ error: "Failed to read status", status: null }, { status: 500 });
  }
};
export {
  GET
};
