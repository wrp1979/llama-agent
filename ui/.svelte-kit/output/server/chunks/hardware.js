import { existsSync, readFileSync } from "fs";
const STATUS_FILE = "/app/config/system-status.json";
function estimateLayers(modelSizeGb) {
  if (modelSizeGb < 3) return 24;
  if (modelSizeGb < 6) return 32;
  if (modelSizeGb < 10) return 40;
  if (modelSizeGb < 25) return 48;
  if (modelSizeGb < 50) return 64;
  if (modelSizeGb < 100) return 80;
  return 96;
}
const VRAM_OVERHEAD_MB = 1500;
const RAM_OVERHEAD_MB = 2e3;
function getHardwareInfo() {
  try {
    if (!existsSync(STATUS_FILE)) {
      return null;
    }
    const content = readFileSync(STATUS_FILE, "utf-8");
    const status = JSON.parse(content);
    return {
      gpu: status.gpu ? {
        name: status.gpu.name,
        vramTotalMb: status.gpu.memory_total_mb,
        vramFreeMb: status.gpu.memory_free_mb,
        vramUsedMb: status.gpu.memory_used_mb
      } : null,
      memory: {
        totalMb: status.memory.total_mb,
        availableMb: status.memory.available_mb,
        usedMb: status.memory.used_mb
      }
    };
  } catch (e) {
    console.error("Failed to read hardware info:", e);
    return null;
  }
}
function analyzeCompatibility(modelSizeBytes, hardware) {
  const modelSizeGb = modelSizeBytes / 1e9;
  const modelSizeMb = modelSizeBytes / 1e6;
  const hw = hardware || {
    gpu: { vramTotalMb: 8e3 },
    memory: { availableMb: 8e3 }
  };
  const vramTotal = hw.gpu?.vramTotalMb || 0;
  const vramAvailable = vramTotal - VRAM_OVERHEAD_MB;
  const ramAvailable = hw.memory.availableMb - RAM_OVERHEAD_MB;
  const estimatedLayers = estimateLayers(modelSizeGb);
  const memoryPerLayer = modelSizeMb / estimatedLayers;
  const layersInVram = Math.floor(vramAvailable / memoryPerLayer);
  const recommendedGpuLayers = Math.min(layersInVram, estimatedLayers);
  const vramRequired = Math.min(modelSizeMb, recommendedGpuLayers * memoryPerLayer);
  const ramRequired = modelSizeMb - vramRequired;
  const willFitInVram = modelSizeMb <= vramAvailable;
  const willFitInTotal = modelSizeMb <= vramAvailable + ramAvailable;
  let status;
  let message;
  let canRun;
  if (willFitInVram) {
    status = "excellent";
    message = `Runs fully on GPU (${recommendedGpuLayers} layers). Excellent performance.`;
    canRun = true;
  } else if (recommendedGpuLayers >= estimatedLayers * 0.7) {
    status = "good";
    message = `${recommendedGpuLayers}/${estimatedLayers} layers on GPU. Good performance with some CPU offload.`;
    canRun = true;
  } else if (willFitInTotal) {
    status = "warning";
    const cpuLayers = estimatedLayers - recommendedGpuLayers;
    message = `Only ${recommendedGpuLayers}/${estimatedLayers} layers on GPU. ${cpuLayers} layers on CPU will be slow.`;
    canRun = true;
  } else {
    status = "poor";
    const neededGb = (modelSizeMb / 1e3).toFixed(1);
    const availableGb = ((vramAvailable + ramAvailable) / 1e3).toFixed(1);
    message = `Model needs ${neededGb}GB, only ${availableGb}GB available. May fail to load.`;
    canRun = false;
  }
  return {
    status,
    message,
    canRun,
    recommendedGpuLayers,
    estimatedTotalLayers: estimatedLayers,
    vramRequired,
    ramRequired,
    willFitInVram
  };
}
export {
  analyzeCompatibility as a,
  getHardwareInfo as g
};
