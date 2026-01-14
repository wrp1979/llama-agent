import type { AgentServer } from '$lib/types';

const API_BASE = '/api/db/servers';

// Reactive state using Svelte 5 runes
let servers = $state<AgentServer[]>([]);
let activeServerId = $state<string | null>(null);
let initialized = $state(false);

// Convert DB server to AgentServer type
function toAgentServer(dbServer: Record<string, unknown>): AgentServer {
  return {
    id: dbServer.id as string,
    name: dbServer.name as string,
    url: dbServer.url as string,
    apiKey: (dbServer.apiKey || dbServer.api_key || '') as string,
    isLocal: Boolean(dbServer.isLocal || dbServer.is_local),
    autoConnect: Boolean(dbServer.autoConnect || dbServer.auto_connect),
    status: 'disconnected',
  };
}

export const serversStore = {
  get servers() {
    return servers;
  },

  get activeServerId() {
    return activeServerId;
  },

  get activeServer(): AgentServer | null {
    return servers.find(s => s.id === activeServerId) ?? null;
  },

  get initialized() {
    return initialized;
  },

  async init(): Promise<void> {
    if (initialized) return;

    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        servers = (data.servers || []).map(toAgentServer);

        // Set active server (prefer autoConnect, then first)
        const autoConnectServer = servers.find(s => s.autoConnect);
        activeServerId = autoConnectServer?.id || servers[0]?.id || null;
      }
    } catch (error) {
      console.error('Failed to load servers from API:', error);
      // Fallback to empty but with a local placeholder
      servers = [{
        id: 'local',
        name: 'Local Agent',
        url: 'http://llama:8081',
        apiKey: '',
        isLocal: true,
        autoConnect: true,
        status: 'disconnected',
      }];
      activeServerId = 'local';
    }

    initialized = true;
  },

  async addServer(server: Omit<AgentServer, 'id' | 'status'>): Promise<AgentServer> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        throw new Error('Failed to create server');
      }

      const data = await response.json();
      const newServer = toAgentServer(data.server);
      servers = [...servers, newServer];
      return newServer;
    } catch (error) {
      console.error('Failed to add server:', error);
      // Fallback to local-only creation
      const newServer: AgentServer = {
        ...server,
        id: `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'disconnected',
      };
      servers = [...servers, newServer];
      return newServer;
    }
  },

  async updateServer(id: string, updates: Partial<AgentServer>): Promise<void> {
    try {
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedServer = toAgentServer(data.server);
        servers = servers.map(s => s.id === id ? { ...updatedServer, status: s.status } : s);
      }
    } catch (error) {
      console.error('Failed to update server:', error);
      // Update locally anyway
      servers = servers.map(s => s.id === id ? { ...s, ...updates } : s);
    }
  },

  async removeServer(id: string): Promise<void> {
    // Don't allow removing local server
    const server = servers.find(s => s.id === id);
    if (server?.isLocal) return;

    try {
      await fetch(API_BASE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error('Failed to delete server from DB:', error);
    }

    // Remove locally regardless
    servers = servers.filter(s => s.id !== id);

    // If we removed the active server, switch to first available
    if (activeServerId === id) {
      activeServerId = servers[0]?.id ?? null;
    }
  },

  setActive(id: string): void {
    if (servers.find(s => s.id === id)) {
      activeServerId = id;
    }
  },

  setStatus(id: string, status: AgentServer['status'], error?: string): void {
    const server = servers.find(s => s.id === id);
    if (!server) return;

    // Only update if status actually changed to avoid unnecessary re-renders
    if (server.status === status && server.lastError === error) {
      return;
    }

    // Mutate in place to minimize reactivity triggers
    server.status = status;
    server.lastError = error;
    server.lastChecked = new Date();
  },

  getServer(id: string): AgentServer | undefined {
    return servers.find(s => s.id === id);
  },
};
