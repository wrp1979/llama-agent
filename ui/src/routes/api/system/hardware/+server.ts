import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getHardwareInfo, analyzeCompatibility, type HardwareInfo, type ModelCompatibility } from '$lib/server/hardware';

// GET /api/system/hardware - Get hardware info and optionally analyze model compatibility
export const GET: RequestHandler = async ({ url }) => {
  try {
    const hardware = getHardwareInfo();

    if (!hardware) {
      return json({ error: 'Hardware info not available' }, { status: 503 });
    }

    // If modelSize is provided, also return compatibility analysis
    const modelSize = url.searchParams.get('modelSize');

    if (modelSize) {
      const sizeBytes = parseFloat(modelSize);
      if (!isNaN(sizeBytes)) {
        const compatibility = analyzeCompatibility(sizeBytes, hardware);
        return json({ hardware, compatibility });
      }
    }

    return json({ hardware });
  } catch (error) {
    console.error('Failed to get hardware info:', error);
    return json({ error: 'Failed to get hardware info' }, { status: 500 });
  }
};

// POST /api/system/hardware/analyze - Analyze compatibility for multiple models
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { models } = body as { models: Array<{ name: string; size: number }> };

    if (!models || !Array.isArray(models)) {
      return json({ error: 'models array is required' }, { status: 400 });
    }

    const hardware = getHardwareInfo();

    const results = models.map(model => ({
      name: model.name,
      size: model.size,
      compatibility: analyzeCompatibility(model.size, hardware),
    }));

    return json({ hardware, results });
  } catch (error) {
    console.error('Failed to analyze compatibility:', error);
    return json({ error: 'Analysis failed' }, { status: 500 });
  }
};
