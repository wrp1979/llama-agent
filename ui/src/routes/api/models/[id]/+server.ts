import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const HF_API_BASE = 'https://huggingface.co/api';

export interface ModelFile {
  name: string;
  size: number;
  sizeFormatted: string;
  quantization: string;
}

export interface ModelDetails {
  id: string;
  author: string;
  name: string;
  downloads: number;
  likes: number;
  tags: string[];
  description: string;
  lastModified: string;
  files: ModelFile[];
}

// GET /api/models/[id] - Get model details
export const GET: RequestHandler = async ({ params }) => {
  try {
    // The id comes URL encoded, decode it (e.g., "bartowski%2FMeta-Llama..." -> "bartowski/Meta-Llama...")
    const modelId = decodeURIComponent(params.id);

    // Fetch model info
    const modelResponse = await fetch(`${HF_API_BASE}/models/${modelId}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!modelResponse.ok) {
      return json({ error: 'Model not found' }, { status: 404 });
    }

    const modelData = await modelResponse.json();

    // Fetch file tree to get sizes
    const treeResponse = await fetch(`${HF_API_BASE}/models/${modelId}/tree/main`, {
      headers: { 'Accept': 'application/json' }
    });

    let files: ModelFile[] = [];

    if (treeResponse.ok) {
      const treeData = await treeResponse.json();

      // Filter GGUF files and transform
      files = treeData
        .filter((f: Record<string, unknown>) => {
          const path = f.path as string || '';
          return path.endsWith('.gguf');
        })
        .map((f: Record<string, unknown>) => {
          const path = f.path as string;
          const size = (f.size as number) || 0;

          return {
            name: path,
            size,
            sizeFormatted: formatSize(size),
            quantization: extractQuantization(path),
          };
        })
        .sort((a: ModelFile, b: ModelFile) => {
          // Sort by quantization quality (higher quality first)
          const order = ['F32', 'F16', 'BF16', 'Q8_0', 'Q6_K', 'Q5_K_M', 'Q5_K_S', 'Q5_0', 'Q4_K_M', 'Q4_K_S', 'Q4_0', 'Q3_K_M', 'Q3_K_S', 'Q2_K', 'IQ4', 'IQ3', 'IQ2', 'IQ1'];
          const aIdx = order.findIndex(q => a.quantization.includes(q));
          const bIdx = order.findIndex(q => b.quantization.includes(q));
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
    }

    const parts = modelId.split('/');
    const details: ModelDetails = {
      id: modelId,
      author: parts[0] || '',
      name: parts[1] || modelId,
      downloads: modelData.downloads || 0,
      likes: modelData.likes || 0,
      tags: modelData.tags || [],
      description: extractDescription(modelData),
      lastModified: modelData.lastModified || '',
      files,
    };

    return json({ model: details });
  } catch (error) {
    console.error('Model details error:', error);
    return json({ error: 'Failed to fetch model details' }, { status: 500 });
  }
};

function formatSize(bytes: number): string {
  if (bytes >= 1e9) {
    return `${(bytes / 1e9).toFixed(2)} GB`;
  }
  if (bytes >= 1e6) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${bytes} bytes`;
}

function extractQuantization(filename: string): string {
  // Extract quantization from filename like "Model-Q4_K_M.gguf"
  const match = filename.match(/[-_]((?:IQ|Q|F|BF)\d+[A-Z_]*(?:_[A-Z0-9]+)?)/i);
  return match ? match[1].toUpperCase() : 'Unknown';
}

function extractDescription(data: Record<string, unknown>): string {
  // Try to get description from cardData or README
  const cardData = data.cardData as Record<string, unknown> | undefined;

  if (cardData) {
    // Check for model card sections
    const modelCard = cardData as Record<string, unknown>;
    if (modelCard.model_name) {
      return `${modelCard.model_name}`;
    }
  }

  // Build description from tags
  const tags = (data.tags as string[]) || [];
  const relevantTags = tags.filter(t =>
    !t.startsWith('base_model:') &&
    !t.startsWith('license:') &&
    !t.includes('region:') &&
    t !== 'gguf' &&
    t !== 'endpoints_compatible'
  );

  if (relevantTags.length > 0) {
    return `Tags: ${relevantTags.slice(0, 5).join(', ')}`;
  }

  return 'GGUF quantized model for llama.cpp';
}
