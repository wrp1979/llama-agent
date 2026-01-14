import { json } from "@sveltejs/kit";
import { existsSync, readdirSync, statSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { b as CURRENT_MODEL_FILE } from "../../../../../chunks/config.js";
function getModelsDir() {
  if (existsSync("/models")) {
    return "/models";
  }
  const devPath = join(process.cwd(), "..", "models");
  if (existsSync(devPath)) {
    return devPath;
  }
  return "/models";
}
const MODELS_DIR = getModelsDir();
function formatSize(bytes) {
  if (bytes >= 1e9) {
    return `${(bytes / 1e9).toFixed(2)} GB`;
  }
  if (bytes >= 1e6) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${bytes} bytes`;
}
function getCurrentModel() {
  try {
    if (existsSync(CURRENT_MODEL_FILE)) {
      return readFileSync(CURRENT_MODEL_FILE, "utf-8").trim();
    }
  } catch {
  }
  return null;
}
const GET = async () => {
  try {
    if (!existsSync(MODELS_DIR)) {
      return json({ models: [], error: "Models directory not found" });
    }
    const currentModel = getCurrentModel();
    const files = readdirSync(MODELS_DIR);
    const models = [];
    const MIN_MODEL_SIZE = 100 * 1e6;
    for (const file of files) {
      if (!file.endsWith(".gguf")) continue;
      const filePath = join(MODELS_DIR, file);
      try {
        const stats = statSync(filePath);
        if (stats.size < MIN_MODEL_SIZE) continue;
        models.push({
          name: file,
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          modified: Math.floor(stats.mtimeMs / 1e3),
          isActive: file === currentModel
        });
      } catch {
      }
    }
    models.sort((a, b) => b.modified - a.modified);
    return json({ models, currentModel });
  } catch (error) {
    console.error("Failed to list models:", error);
    return json({ error: "Failed to list models", models: [] }, { status: 500 });
  }
};
const DELETE = async ({ request }) => {
  try {
    const body = await request.json();
    const { model } = body;
    if (!model) {
      return json({ error: "Model name is required" }, { status: 400 });
    }
    if (model.includes("/") || model.includes("..")) {
      return json({ error: "Invalid model name" }, { status: 400 });
    }
    const currentModel = getCurrentModel();
    if (model === currentModel) {
      return json({ error: "Cannot delete the currently active model. Switch to another model first." }, { status: 400 });
    }
    const filePath = join(MODELS_DIR, model);
    if (!existsSync(filePath)) {
      return json({ error: "Model not found" }, { status: 404 });
    }
    unlinkSync(filePath);
    return json({ success: true, message: `Deleted ${model}` });
  } catch (error) {
    console.error("Failed to delete model:", error);
    return json({ error: "Failed to delete model" }, { status: 500 });
  }
};
export {
  DELETE,
  GET
};
