import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { SWITCH_MODEL_REQUEST_FILE, SWITCH_MODEL_STATUS_FILE, CONFIG_DIR } from '$lib/server/config';

export interface SwitchModelStatus {
  status: 'idle' | 'switching' | 'loading' | 'ready' | 'error';
  message: string;
  model: string;
  timestamp: number;
}

// GET /api/system/switch-model - Get switch status
export const GET: RequestHandler = async () => {
  try {
    if (!existsSync(SWITCH_MODEL_STATUS_FILE)) {
      return json({ status: { status: 'idle', message: 'No switch in progress', model: '', timestamp: 0 } });
    }

    const content = readFileSync(SWITCH_MODEL_STATUS_FILE, 'utf-8');
    const status: SwitchModelStatus = JSON.parse(content);
    return json({ status });
  } catch (error) {
    console.error('Failed to read switch status:', error);
    return json({ status: { status: 'idle', message: 'Unknown', model: '', timestamp: 0 } });
  }
};

// POST /api/system/switch-model - Request model switch
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { model } = body;

    if (!model) {
      return json({ error: 'Model name is required' }, { status: 400 });
    }

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Write the request file - the model-manager will pick it up
    writeFileSync(SWITCH_MODEL_REQUEST_FILE, model, 'utf-8');

    return json({ success: true, message: `Requested switch to ${model}` });
  } catch (error) {
    console.error('Failed to request model switch:', error);
    return json({ error: 'Failed to request model switch' }, { status: 500 });
  }
};
