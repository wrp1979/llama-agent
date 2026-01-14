import { json } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import type { RequestHandler } from './$types';
import { SERVERS_CONFIG_FILE } from '$lib/server/config';

export const GET: RequestHandler = async () => {
  try {
    if (existsSync(SERVERS_CONFIG_FILE)) {
      const content = readFileSync(SERVERS_CONFIG_FILE, 'utf-8');
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
