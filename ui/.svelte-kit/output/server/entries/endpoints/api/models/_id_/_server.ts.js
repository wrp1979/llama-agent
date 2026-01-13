import { json } from "@sveltejs/kit";
import { g as getHardwareInfo, a as analyzeCompatibility } from "../../../../../chunks/hardware.js";
const HF_API_BASE = "https://huggingface.co/api";
const GET = async ({ params }) => {
  try {
    const modelId = decodeURIComponent(params.id);
    const modelResponse = await fetch(`${HF_API_BASE}/models/${modelId}`, {
      headers: { "Accept": "application/json" }
    });
    if (!modelResponse.ok) {
      return json({ error: "Model not found" }, { status: 404 });
    }
    const modelData = await modelResponse.json();
    const treeResponse = await fetch(`${HF_API_BASE}/models/${modelId}/tree/main`, {
      headers: { "Accept": "application/json" }
    });
    let files = [];
    const hardware = getHardwareInfo();
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      files = treeData.filter((f) => {
        const path = f.path || "";
        return path.endsWith(".gguf");
      }).map((f) => {
        const path = f.path;
        const size = f.size || 0;
        return {
          name: path,
          size,
          sizeFormatted: formatSize(size),
          quantization: extractQuantization(path),
          compatibility: analyzeCompatibility(size, hardware)
        };
      }).sort((a, b) => {
        const compatOrder = { excellent: 0, good: 1, warning: 2, poor: 3 };
        const compatDiff = compatOrder[a.compatibility.status] - compatOrder[b.compatibility.status];
        if (compatDiff !== 0) return compatDiff;
        const order = ["F32", "F16", "BF16", "Q8_0", "Q6_K", "Q5_K_M", "Q5_K_S", "Q5_0", "Q4_K_M", "Q4_K_S", "Q4_0", "Q3_K_M", "Q3_K_S", "Q2_K", "IQ4", "IQ3", "IQ2", "IQ1"];
        const aIdx = order.findIndex((q) => a.quantization.includes(q));
        const bIdx = order.findIndex((q) => b.quantization.includes(q));
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    }
    const parts = modelId.split("/");
    const details = {
      id: modelId,
      author: parts[0] || "",
      name: parts[1] || modelId,
      downloads: modelData.downloads || 0,
      likes: modelData.likes || 0,
      tags: modelData.tags || [],
      description: extractDescription(modelData),
      lastModified: modelData.lastModified || "",
      files
    };
    return json({ model: details });
  } catch (error) {
    console.error("Model details error:", error);
    return json({ error: "Failed to fetch model details" }, { status: 500 });
  }
};
function formatSize(bytes) {
  if (bytes >= 1e9) {
    return `${(bytes / 1e9).toFixed(2)} GB`;
  }
  if (bytes >= 1e6) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${bytes} bytes`;
}
function extractQuantization(filename) {
  const match = filename.match(/[-_]((?:IQ|Q|F|BF)\d+[A-Z_]*(?:_[A-Z0-9]+)?)/i);
  return match ? match[1].toUpperCase() : "Unknown";
}
function extractDescription(data) {
  const cardData = data.cardData;
  if (cardData) {
    const modelCard = cardData;
    if (modelCard.model_name) {
      return `${modelCard.model_name}`;
    }
  }
  const tags = data.tags || [];
  const relevantTags = tags.filter(
    (t) => !t.startsWith("base_model:") && !t.startsWith("license:") && !t.includes("region:") && t !== "gguf" && t !== "endpoints_compatible"
  );
  if (relevantTags.length > 0) {
    return `Tags: ${relevantTags.slice(0, 5).join(", ")}`;
  }
  return "GGUF quantized model for llama.cpp";
}
export {
  GET
};
