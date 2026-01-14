import { json } from "@sveltejs/kit";
import { existsSync, readFileSync } from "fs";
import { S as SERVERS_CONFIG_FILE } from "../../../../chunks/config.js";
const GET = async () => {
  try {
    if (existsSync(SERVERS_CONFIG_FILE)) {
      const content = readFileSync(SERVERS_CONFIG_FILE, "utf-8");
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
