import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

// Convert localhost URLs to Docker internal hostname for server-side fetch
function getServerSideUrl(url: string): string {
  return url.replace('localhost:8081', 'llama:8081').replace('127.0.0.1:8081', 'llama:8081');
}

// POST /api/db/sessions/generate-title - Generate a title for a session using LLM
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, prompt } = body;

    if (!sessionId || !prompt) {
      return json({ error: 'sessionId and prompt are required' }, { status: 400 });
    }

    // Get session to find the server and external session ID
    const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).get();
    if (!session || !session.externalId) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    // Get server for API access
    const server = await db.select().from(schema.servers).where(eq(schema.servers.id, session.serverId)).get();
    if (!server) {
      return json({ error: 'Server not found' }, { status: 404 });
    }

    // Build title generation prompt
    const titlePrompt = `Generate a very short title (3-6 words max, no more than 40 characters) that summarizes this user message. Return ONLY the title text, nothing else. No quotes, no explanation, no punctuation at the end.

User message: "${prompt.slice(0, 300)}"`;

    // Call LLM via agent chat endpoint (streaming SSE)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (server.apiKey) {
      headers['Authorization'] = `Bearer ${server.apiKey}`;
    }

    const serverUrl = getServerSideUrl(server.url);
    const response = await fetch(`${serverUrl}/v1/agent/session/${session.externalId}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: titlePrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM request failed:', errorText);
      return json({ error: 'LLM request failed' }, { status: 500 });
    }

    // Parse SSE stream to extract assistant response
    const title = await parseSSEResponse(response);

    // Clean up title
    const cleanTitle = cleanupTitle(title);

    // Update session name in database
    await db.update(schema.sessions)
      .set({ name: cleanTitle, updatedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));

    return json({ title: cleanTitle });
  } catch (error) {
    console.error('Failed to generate title:', error);
    return json({ error: 'Failed to generate title' }, { status: 500 });
  }
};

// Parse SSE stream and extract text content from assistant response
async function parseSSEResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let assistantContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          // Capture text_delta content
          if (parsed.content && typeof parsed.content === 'string') {
            assistantContent += parsed.content;
          }
        } catch {
          // Ignore non-JSON data lines
        }
      }
    }
  }

  return assistantContent;
}

// Clean up the generated title
function cleanupTitle(title: string): string {
  let clean = title.trim();

  // Remove surrounding quotes
  clean = clean.replace(/^["'`]|["'`]$/g, '');

  // Remove "Title:" prefix if present
  clean = clean.replace(/^title:\s*/i, '');

  // Remove trailing punctuation
  clean = clean.replace(/[.!?]+$/, '');

  // Limit length
  if (clean.length > 45) {
    clean = clean.slice(0, 42) + '...';
  }

  return clean || 'New Session';
}
