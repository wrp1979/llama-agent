import type { Session, PermissionRequest } from './types';

const API_BASE = '/v1/agent';

export async function createSession(options: { yolo?: boolean; working_dir?: string } = {}): Promise<Session> {
  const response = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error(`Failed to create session: ${response.statusText}`);
  return response.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE}/session/${sessionId}`);
  if (!response.ok) throw new Error(`Failed to get session: ${response.statusText}`);
  return response.json();
}

export async function listSessions(): Promise<Session[]> {
  const response = await fetch(`${API_BASE}/sessions`);
  if (!response.ok) throw new Error(`Failed to list sessions: ${response.statusText}`);
  const data = await response.json();
  return data.sessions || [];
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/session/${sessionId}/delete`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Failed to delete session: ${response.statusText}`);
}

export async function getMessages(sessionId: string): Promise<unknown[]> {
  const response = await fetch(`${API_BASE}/session/${sessionId}/messages`);
  if (!response.ok) throw new Error(`Failed to get messages: ${response.statusText}`);
  const data = await response.json();
  return data.messages || [];
}

export async function getPendingPermissions(sessionId: string): Promise<PermissionRequest[]> {
  const response = await fetch(`${API_BASE}/session/${sessionId}/permissions`);
  if (!response.ok) throw new Error(`Failed to get permissions: ${response.statusText}`);
  const data = await response.json();
  return data.pending || [];
}

export async function respondToPermission(
  requestId: string,
  allow: boolean,
  scope: 'once' | 'session' | 'always' = 'once'
): Promise<void> {
  const response = await fetch(`${API_BASE}/permission/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allow, scope }),
  });
  if (!response.ok) throw new Error(`Failed to respond to permission: ${response.statusText}`);
}

export async function listTools(): Promise<unknown[]> {
  const response = await fetch(`${API_BASE}/tools`);
  if (!response.ok) throw new Error(`Failed to list tools: ${response.statusText}`);
  const data = await response.json();
  return data.tools || [];
}

export async function getSessionStats(sessionId: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}/session/${sessionId}/stats`);
  if (!response.ok) throw new Error(`Failed to get stats: ${response.statusText}`);
  return response.json();
}

export function sendMessage(
  sessionId: string,
  content: string,
  onEvent: (event: string, data: unknown) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/session/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              onEvent(currentEvent, parsed);
            } catch {
              onEvent(currentEvent, data);
            }
          }
        }
      }
      onComplete();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return () => controller.abort();
}
