import { json } from "@sveltejs/kit";
import { g as getHardwareInfo, a as analyzeCompatibility } from "../../../../../chunks/hardware.js";
const GET = async ({ url }) => {
  try {
    const hardware = getHardwareInfo();
    if (!hardware) {
      return json({ error: "Hardware info not available" }, { status: 503 });
    }
    const modelSize = url.searchParams.get("modelSize");
    if (modelSize) {
      const sizeBytes = parseFloat(modelSize);
      if (!isNaN(sizeBytes)) {
        const compatibility = analyzeCompatibility(sizeBytes, hardware);
        return json({ hardware, compatibility });
      }
    }
    return json({ hardware });
  } catch (error) {
    console.error("Failed to get hardware info:", error);
    return json({ error: "Failed to get hardware info" }, { status: 500 });
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { models } = body;
    if (!models || !Array.isArray(models)) {
      return json({ error: "models array is required" }, { status: 400 });
    }
    const hardware = getHardwareInfo();
    const results = models.map((model) => ({
      name: model.name,
      size: model.size,
      compatibility: analyzeCompatibility(model.size, hardware)
    }));
    return json({ hardware, results });
  } catch (error) {
    console.error("Failed to analyze compatibility:", error);
    return json({ error: "Analysis failed" }, { status: 500 });
  }
};
export {
  GET,
  POST
};
