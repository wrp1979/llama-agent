import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const HF_API_BASE = 'https://huggingface.co/api';

// Known GGUF model providers (sorted by quality/popularity)
const GGUF_AUTHORS = ['bartowski', 'unsloth', 'TheBloke', 'QuantFactory', 'mlx-community'];

export interface HFModel {
  id: string;
  author: string;
  name: string;
  downloads: number;
  likes: number;
  tags: string[];
  lastModified: string;
}

// GET /api/models/search - Search for GGUF models
export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const author = url.searchParams.get('author') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let apiUrl: string;

    if (query) {
      // Search with query - look for GGUF in name
      apiUrl = `${HF_API_BASE}/models?search=${encodeURIComponent(query + ' GGUF')}&sort=downloads&direction=-1&limit=${limit}`;
    } else if (author) {
      // Search by author
      apiUrl = `${HF_API_BASE}/models?author=${encodeURIComponent(author)}&sort=downloads&direction=-1&limit=${limit}`;
    } else {
      // Default: get popular models from known GGUF providers
      const results: HFModel[] = [];

      for (const auth of GGUF_AUTHORS.slice(0, 3)) {
        try {
          const response = await fetch(
            `${HF_API_BASE}/models?author=${auth}&sort=downloads&direction=-1&limit=10`,
            { headers: { 'Accept': 'application/json' } }
          );

          if (response.ok) {
            const models = await response.json();
            for (const model of models) {
              // Only include models with GGUF tag
              if (model.tags?.includes('gguf')) {
                results.push(transformModel(model));
              }
            }
          }
        } catch (e) {
          console.error(`Failed to fetch from ${auth}:`, e);
        }
      }

      // Sort by downloads and return top results
      results.sort((a, b) => b.downloads - a.downloads);
      return json({ models: results.slice(0, limit) });
    }

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return json({ error: 'Failed to fetch models', models: [] }, { status: 500 });
    }

    const data = await response.json();

    // Filter to only GGUF models
    const models: HFModel[] = data
      .filter((m: Record<string, unknown>) => {
        const tags = m.tags as string[] || [];
        const id = m.id as string || '';
        return tags.includes('gguf') || id.toLowerCase().includes('gguf');
      })
      .map(transformModel)
      .slice(0, limit);

    return json({ models });
  } catch (error) {
    console.error('Model search error:', error);
    return json({ error: 'Search failed', models: [] }, { status: 500 });
  }
};

function transformModel(m: Record<string, unknown>): HFModel {
  const id = m.id as string || '';
  const parts = id.split('/');

  return {
    id,
    author: parts[0] || '',
    name: parts[1] || id,
    downloads: (m.downloads as number) || 0,
    likes: (m.likes as number) || 0,
    tags: (m.tags as string[]) || [],
    lastModified: (m.lastModified as string) || '',
  };
}
