import type { Message } from '$lib/types';

const SESSIONS_API = '/api/db/sessions';
const MESSAGES_API = '/api/db/messages';
const GENERATE_TITLE_API = '/api/db/sessions/generate-title';

export interface DbSession {
  id: string;
  serverId: string;
  externalId: string | null;
  name: string | null;
  yoloMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string | null;
  toolArgs?: string | null;
  toolResult?: string | null;
  toolSuccess?: boolean | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  durationMs?: number | null;
  createdAt: Date;
}

// Convert DB message to UI Message type
function toUIMessage(dbMsg: DbMessage): Message {
  return {
    id: dbMsg.id,
    role: dbMsg.role,
    content: dbMsg.content,
    toolName: dbMsg.toolName || undefined,
    toolSuccess: dbMsg.toolSuccess ?? undefined,
    timestamp: new Date(dbMsg.createdAt),
  };
}

// Convert DB session
function toDbSession(raw: Record<string, unknown>): DbSession {
  return {
    id: raw.id as string,
    serverId: (raw.serverId || raw.server_id) as string,
    externalId: (raw.externalId || raw.external_id) as string | null,
    name: raw.name as string | null,
    yoloMode: Boolean(raw.yoloMode ?? raw.yolo_mode ?? true),
    createdAt: new Date((raw.createdAt || raw.created_at) as number),
    updatedAt: new Date((raw.updatedAt || raw.updated_at) as number),
  };
}

export const sessionsStore = {
  // Fetch sessions for a server
  async listSessions(serverId: string): Promise<DbSession[]> {
    try {
      const response = await fetch(`${SESSIONS_API}?serverId=${serverId}`);
      if (response.ok) {
        const data = await response.json();
        return (data.sessions || []).map(toDbSession);
      }
    } catch (error) {
      console.error('Failed to list sessions:', error);
    }
    return [];
  },

  // Create a new session in the database
  async createSession(serverId: string, externalId: string, yoloMode: boolean = true): Promise<DbSession | null> {
    try {
      const response = await fetch(SESSIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          externalId,
          name: `Session ${new Date().toLocaleString()}`,
          yoloMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return toDbSession(data.session);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  },

  // Update session (e.g., update name or externalId)
  async updateSession(id: string, updates: Partial<DbSession>): Promise<void> {
    try {
      await fetch(SESSIONS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  },

  // Delete a session
  async deleteSession(id: string): Promise<void> {
    try {
      await fetch(SESSIONS_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  // Fetch messages for a session
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      const response = await fetch(`${MESSAGES_API}?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        return (data.messages || []).map((m: DbMessage) => toUIMessage(m));
      }
    } catch (error) {
      console.error('Failed to get messages:', error);
    }
    return [];
  },

  // Save a single message
  async saveMessage(
    sessionId: string,
    message: Message,
    extra?: { inputTokens?: number; outputTokens?: number; durationMs?: number }
  ): Promise<void> {
    try {
      await fetch(MESSAGES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role: message.role,
          content: message.content,
          toolName: message.toolName,
          toolSuccess: message.toolSuccess,
          inputTokens: extra?.inputTokens,
          outputTokens: extra?.outputTokens,
          durationMs: extra?.durationMs,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  },

  // Save multiple messages at once
  async saveMessages(sessionId: string, messages: Message[]): Promise<void> {
    try {
      const messagesToSave = messages.map(m => ({
        sessionId,
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        toolSuccess: m.toolSuccess,
      }));

      await fetch(MESSAGES_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSave }),
      });
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  },

  // Delete all messages in a session
  async clearMessages(sessionId: string): Promise<void> {
    try {
      await fetch(MESSAGES_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  },

  // Generate a title for a session based on the first prompt
  async generateTitle(sessionId: string, prompt: string): Promise<string | null> {
    try {
      const response = await fetch(GENERATE_TITLE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, prompt }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.title || null;
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
    }
    return null;
  },
};
