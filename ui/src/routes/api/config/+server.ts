import { json } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

const CONFIG_PATH = '/app/config/servers.json';

export const GET: RequestHandler = async () => {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content);
      return json(config);
    }
  } catch (error) {
    console.error('Failed to read config:', error);
  }

  // Return empty config if file doesn't exist
  return json({
    servers: [],
    activeServerId: null,
  });
};
