import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const REQUEST_FILE = '/app/config/switch-model.request';
const STATUS_FILE = '/app/config/switch-model.status';

export interface SwitchModelStatus {
  status: 'idle' | 'switching' | 'loading' | 'ready' | 'error';
  message: string;
  model: string;
  timestamp: number;
}

// GET /api/system/switch-model - Get switch status
export const GET: RequestHandler = async () => {
  try {
    if (!existsSync(STATUS_FILE)) {
      return json({ status: { status: 'idle', message: 'No switch in progress', model: '', timestamp: 0 } });
    }

    const content = readFileSync(STATUS_FILE, 'utf-8');
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

    // Write the request file - the model-manager will pick it up
    writeFileSync(REQUEST_FILE, model, 'utf-8');

    return json({ success: true, message: `Requested switch to ${model}` });
  } catch (error) {
    console.error('Failed to request model switch:', error);
    return json({ error: 'Failed to request model switch' }, { status: 500 });
  }
};
