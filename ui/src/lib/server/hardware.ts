import { readFileSync, existsSync } from 'fs';
import { SYSTEM_SYSTEM_STATUS_FILE } from './config';

export interface HardwareInfo {
  gpu: {
    name: string;
    vramTotalMb: number;
    vramFreeMb: number;
    vramUsedMb: number;
  } | null;
  memory: {
    totalMb: number;
    availableMb: number;
    usedMb: number;
  };
}

export interface ModelCompatibility {
  status: 'excellent' | 'good' | 'warning' | 'poor';
  message: string;
  canRun: boolean;
  recommendedGpuLayers: number;
  estimatedTotalLayers: number;
  vramRequired: number;
  ramRequired: number;
  willFitInVram: boolean;
}

// Estimated layers per model size (rough approximation)
// Based on common architectures: 7B ~32 layers, 13B ~40 layers, 70B ~80 layers
function estimateLayers(modelSizeGb: number): number {
  if (modelSizeGb < 3) return 24;      // ~1-3B models
  if (modelSizeGb < 6) return 32;      // ~7B models
  if (modelSizeGb < 10) return 40;     // ~13B models
  if (modelSizeGb < 25) return 48;     // ~30B models
  if (modelSizeGb < 50) return 64;     // ~70B models
  if (modelSizeGb < 100) return 80;    // ~120B+ models
  return 96;                            // Very large models
}

// Memory overhead for llama.cpp (context, KV cache, etc.)
const VRAM_OVERHEAD_MB = 1500;  // ~1.5GB for context and overhead
const RAM_OVERHEAD_MB = 2000;   // ~2GB for system overhead

export function getHardwareInfo(): HardwareInfo | null {
  try {
    if (!existsSync(SYSTEM_STATUS_FILE)) {
      return null;
    }

    const content = readFileSync(SYSTEM_STATUS_FILE, 'utf-8');
    const status = JSON.parse(content);

    return {
      gpu: status.gpu ? {
        name: status.gpu.name,
        vramTotalMb: status.gpu.memory_total_mb,
        vramFreeMb: status.gpu.memory_free_mb,
        vramUsedMb: status.gpu.memory_used_mb,
      } : null,
      memory: {
        totalMb: status.memory.total_mb,
        availableMb: status.memory.available_mb,
        usedMb: status.memory.used_mb,
      },
    };
  } catch (e) {
    console.error('Failed to read hardware info:', e);
    return null;
  }
}

export function analyzeCompatibility(modelSizeBytes: number, hardware?: HardwareInfo | null): ModelCompatibility {
  const modelSizeGb = modelSizeBytes / 1e9;
  const modelSizeMb = modelSizeBytes / 1e6;

  // Default hardware if not provided (conservative estimates)
  const hw = hardware || {
    gpu: { name: 'Unknown', vramTotalMb: 8000, vramFreeMb: 6000, vramUsedMb: 2000 },
    memory: { totalMb: 16000, availableMb: 8000, usedMb: 8000 },
  };

  const vramTotal = hw.gpu?.vramTotalMb || 0;
  const vramAvailable = vramTotal - VRAM_OVERHEAD_MB;
  const ramAvailable = hw.memory.availableMb - RAM_OVERHEAD_MB;

  const estimatedLayers = estimateLayers(modelSizeGb);
  const memoryPerLayer = modelSizeMb / estimatedLayers;

  // Calculate how many layers fit in VRAM
  const layersInVram = Math.floor(vramAvailable / memoryPerLayer);
  const recommendedGpuLayers = Math.min(layersInVram, estimatedLayers);

  // Calculate memory requirements
  const vramRequired = Math.min(modelSizeMb, recommendedGpuLayers * memoryPerLayer);
  const ramRequired = modelSizeMb - vramRequired;

  const willFitInVram = modelSizeMb <= vramAvailable;
  const willFitInTotal = modelSizeMb <= (vramAvailable + ramAvailable);

  // Determine compatibility status
  let status: ModelCompatibility['status'];
  let message: string;
  let canRun: boolean;

  if (willFitInVram) {
    // Model fits entirely in VRAM - best performance
    status = 'excellent';
    message = `Runs fully on GPU (${recommendedGpuLayers} layers). Excellent performance.`;
    canRun = true;
  } else if (recommendedGpuLayers >= estimatedLayers * 0.7) {
    // Most layers fit in VRAM - good performance
    status = 'good';
    message = `${recommendedGpuLayers}/${estimatedLayers} layers on GPU. Good performance with some CPU offload.`;
    canRun = true;
  } else if (willFitInTotal) {
    // Significant CPU offload needed - slower
    status = 'warning';
    const cpuLayers = estimatedLayers - recommendedGpuLayers;
    message = `Only ${recommendedGpuLayers}/${estimatedLayers} layers on GPU. ${cpuLayers} layers on CPU will be slow.`;
    canRun = true;
  } else {
    // May not fit at all
    status = 'poor';
    const neededGb = (modelSizeMb / 1000).toFixed(1);
    const availableGb = ((vramAvailable + ramAvailable) / 1000).toFixed(1);
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
    willFitInVram,
  };
}

// Calculate recommended GPU layers for a model
export function calculateGpuLayers(modelSizeBytes: number): number {
  const hardware = getHardwareInfo();
  const compatibility = analyzeCompatibility(modelSizeBytes, hardware);
  return compatibility.recommendedGpuLayers;
}
