import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { CURRENT_MODEL_FILE } from '$lib/server/config';

// Models directory - same logic as config
function getModelsDir(): string {
  if (existsSync('/models')) {
    return '/models';
  }
  const devPath = join(process.cwd(), '..', 'models');
  if (existsSync(devPath)) {
    return devPath;
  }
  return '/models';
}

const MODELS_DIR = getModelsDir();

interface ModelInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  modified: number;
  isActive: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) {
    return `${(bytes / 1e9).toFixed(2)} GB`;
  }
  if (bytes >= 1e6) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${bytes} bytes`;
}

function getCurrentModel(): string | null {
  try {
    if (existsSync(CURRENT_MODEL_FILE)) {
      return readFileSync(CURRENT_MODEL_FILE, 'utf-8').trim();
    }
  } catch {
    // ignore
  }
  return null;
}

// GET /api/system/models - List all models
export const GET: RequestHandler = async () => {
  try {
    if (!existsSync(MODELS_DIR)) {
      return json({ models: [], error: 'Models directory not found' });
    }

    const currentModel = getCurrentModel();
    const files = readdirSync(MODELS_DIR);
    const models: ModelInfo[] = [];

    const MIN_MODEL_SIZE = 100 * 1e6; // 100MB minimum to be considered a model

    for (const file of files) {
      if (!file.endsWith('.gguf')) continue;

      const filePath = join(MODELS_DIR, file);
      try {
        const stats = statSync(filePath);

        // Skip small files (vocab files, test files, etc.)
        if (stats.size < MIN_MODEL_SIZE) continue;

        models.push({
          name: file,
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          modified: Math.floor(stats.mtimeMs / 1000),
          isActive: file === currentModel,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    // Sort by modified date (newest first)
    models.sort((a, b) => b.modified - a.modified);

    return json({ models, currentModel });
  } catch (error) {
    console.error('Failed to list models:', error);
    return json({ error: 'Failed to list models', models: [] }, { status: 500 });
  }
};

// DELETE /api/system/models - Delete a model
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { model } = body as { model: string };

    if (!model) {
      return json({ error: 'Model name is required' }, { status: 400 });
    }

    // Validate filename (prevent path traversal)
    if (model.includes('/') || model.includes('..')) {
      return json({ error: 'Invalid model name' }, { status: 400 });
    }

    // Check if it's the active model
    const currentModel = getCurrentModel();
    if (model === currentModel) {
      return json({ error: 'Cannot delete the currently active model. Switch to another model first.' }, { status: 400 });
    }

    const filePath = join(MODELS_DIR, model);

    if (!existsSync(filePath)) {
      return json({ error: 'Model not found' }, { status: 404 });
    }

    // Delete the file
    unlinkSync(filePath);

    return json({ success: true, message: `Deleted ${model}` });
  } catch (error) {
    console.error('Failed to delete model:', error);
    return json({ error: 'Failed to delete model' }, { status: 500 });
  }
};
