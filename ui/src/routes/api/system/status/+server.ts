import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, existsSync } from 'fs';
import { SYSTEM_STATUS_FILE } from '$lib/server/config';

export interface SystemStatus {
  timestamp: number;
  gpu: {
    name: string;
    memory_total_mb: number;
    memory_used_mb: number;
    memory_free_mb: number;
    utilization_percent: number;
    temperature_c: number;
  } | null;
  memory: {
    total_mb: number;
    free_mb: number;
    available_mb: number;
    used_mb: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    mount_point: string;
  };
  models: Array<{
    name: string;
    size_gb: number;
    modified: number;
  }>;
  active_model: string | null;
}

// GET /api/system/status - Get system status
export const GET: RequestHandler = async () => {
  try {
    if (!existsSync(SYSTEM_STATUS_FILE)) {
      return json({ error: 'Status file not found', status: null }, { status: 404 });
    }

    const content = readFileSync(SYSTEM_STATUS_FILE, 'utf-8');
    const status: SystemStatus = JSON.parse(content);

    // Check if status is stale (more than 30 seconds old)
    const age = Date.now() / 1000 - status.timestamp;
    const isStale = age > 30;

    return json({ status, age, isStale });
  } catch (error) {
    console.error('Failed to read system status:', error);
    return json({ error: 'Failed to read status', status: null }, { status: 500 });
  }
};
