import type { Session, PermissionRequest, AgentServer } from './types';

function getHeaders(server: AgentServer): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (server.apiKey) {
    headers['Authorization'] = `Bearer ${server.apiKey}`;
  }
  return headers;
}

export async function checkServerHealth(server: AgentServer): Promise<boolean> {
  try {
    const response = await fetch(`${server.url}/health`, {
      headers: server.apiKey ? { 'Authorization': `Bearer ${server.apiKey}` } : {},
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createSession(
  server: AgentServer,
  options: { yolo?: boolean; working_dir?: string } = {}
): Promise<Session> {
  const response = await fetch(`${server.url}/v1/agent/session`, {
    method: 'POST',
    headers: getHeaders(server),
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${response.status} ${error}`);
  }
  return response.json();
}

export async function getSession(server: AgentServer, sessionId: string): Promise<Session> {
  const response = await fetch(`${server.url}/v1/agent/session/${sessionId}`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to get session: ${response.statusText}`);
  return response.json();
}

export async function listSessions(server: AgentServer): Promise<Session[]> {
  const response = await fetch(`${server.url}/v1/agent/sessions`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to list sessions: ${response.statusText}`);
  const data = await response.json();
  return data.sessions || [];
}

export async function deleteSession(server: AgentServer, sessionId: string): Promise<void> {
  const response = await fetch(`${server.url}/v1/agent/session/${sessionId}/delete`, {
    method: 'POST',
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to delete session: ${response.statusText}`);
}

export async function getMessages(server: AgentServer, sessionId: string): Promise<unknown[]> {
  const response = await fetch(`${server.url}/v1/agent/session/${sessionId}/messages`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to get messages: ${response.statusText}`);
  const data = await response.json();
  return data.messages || [];
}

export async function getPendingPermissions(
  server: AgentServer,
  sessionId: string
): Promise<PermissionRequest[]> {
  const response = await fetch(`${server.url}/v1/agent/session/${sessionId}/permissions`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to get permissions: ${response.statusText}`);
  const data = await response.json();
  return data.pending || [];
}

export async function respondToPermission(
  server: AgentServer,
  requestId: string,
  allow: boolean,
  scope: 'once' | 'session' | 'always' = 'once'
): Promise<void> {
  const response = await fetch(`${server.url}/v1/agent/permission/${requestId}`, {
    method: 'POST',
    headers: getHeaders(server),
    body: JSON.stringify({ allow, scope }),
  });
  if (!response.ok) throw new Error(`Failed to respond to permission: ${response.statusText}`);
}

export async function listTools(server: AgentServer): Promise<unknown[]> {
  const response = await fetch(`${server.url}/v1/agent/tools`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to list tools: ${response.statusText}`);
  const data = await response.json();
  return data.tools || [];
}

export async function getSessionStats(server: AgentServer, sessionId: string): Promise<unknown> {
  const response = await fetch(`${server.url}/v1/agent/session/${sessionId}/stats`, {
    headers: getHeaders(server),
  });
  if (!response.ok) throw new Error(`Failed to get stats: ${response.statusText}`);
  return response.json();
}

export function sendMessage(
  server: AgentServer,
  sessionId: string,
  content: string,
  onEvent: (event: string, data: unknown) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): () => void {
  const controller = new AbortController();

  fetch(`${server.url}/v1/agent/session/${sessionId}/chat`, {
    method: 'POST',
    headers: getHeaders(server),
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
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
