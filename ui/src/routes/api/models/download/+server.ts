import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const DOWNLOAD_REQUEST_FILE = '/app/config/download-model.request';
const DOWNLOAD_STATUS_FILE = '/app/config/download-model.status';

export interface DownloadRequest {
  repoId: string;
  filename: string;
}

export interface DownloadStatus {
  status: 'idle' | 'downloading' | 'completed' | 'error';
  repoId: string;
  filename: string;
  progress: number;
  speed: string;
  eta: string;
  message: string;
  timestamp: number;
}

// GET /api/models/download - Get download status
export const GET: RequestHandler = async () => {
  try {
    if (!existsSync(DOWNLOAD_STATUS_FILE)) {
      return json({
        status: {
          status: 'idle',
          repoId: '',
          filename: '',
          progress: 0,
          speed: '',
          eta: '',
          message: 'No download in progress',
          timestamp: 0,
        }
      });
    }

    const content = readFileSync(DOWNLOAD_STATUS_FILE, 'utf-8');
    const status: DownloadStatus = JSON.parse(content);
    return json({ status });
  } catch (error) {
    console.error('Failed to read download status:', error);
    return json({
      status: {
        status: 'idle',
        repoId: '',
        filename: '',
        progress: 0,
        speed: '',
        eta: '',
        message: 'Unknown',
        timestamp: 0,
      }
    });
  }
};

// POST /api/models/download - Start model download
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { repoId, filename } = body as DownloadRequest;

    if (!repoId || !filename) {
      return json({ error: 'repoId and filename are required' }, { status: 400 });
    }

    // Write the download request - the download manager will pick it up
    const requestData = JSON.stringify({ repoId, filename });
    writeFileSync(DOWNLOAD_REQUEST_FILE, requestData, 'utf-8');

    return json({ success: true, message: `Requested download of ${filename} from ${repoId}` });
  } catch (error) {
    console.error('Failed to request download:', error);
    return json({ error: 'Failed to request download' }, { status: 500 });
  }
};

// DELETE /api/models/download - Cancel download
export const DELETE: RequestHandler = async () => {
  try {
    // Write cancel signal
    writeFileSync(DOWNLOAD_REQUEST_FILE, JSON.stringify({ cancel: true }), 'utf-8');
    return json({ success: true, message: 'Download cancel requested' });
  } catch (error) {
    console.error('Failed to cancel download:', error);
    return json({ error: 'Failed to cancel download' }, { status: 500 });
  }
};
