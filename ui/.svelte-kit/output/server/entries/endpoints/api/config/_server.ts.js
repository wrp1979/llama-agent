import { json } from "@sveltejs/kit";
import { existsSync, readFileSync } from "fs";
const CONFIG_PATH = "/app/config/servers.json";
const GET = async () => {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(content);
      return json(config);
    }
  } catch (error) {
    console.error("Failed to read config:", error);
  }
  return json({
    servers: [],
    activeServerId: null
  });
};
export {
  GET
};
