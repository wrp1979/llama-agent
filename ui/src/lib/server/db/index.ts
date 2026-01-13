import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';

// Database path - use /data for Docker, fallback to local for dev
const DB_PATH = process.env.DB_PATH || '/data/llama-agent.db';
const CONFIG_PATH = '/app/config/servers.json';

// Ensure directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch {
    console.warn(`Could not create directory ${dbDir}, using fallback`);
  }
}

// Create SQLite connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Read config from entrypoint-generated servers.json
interface ConfigServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  isLocal?: boolean;
  autoConnect?: boolean;
}

interface ServersConfig {
  servers: ConfigServer[];
  activeServerId: string | null;
}

function readConfigFile(): ServersConfig | null {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content) as ServersConfig;
    }
  } catch (error) {
    console.warn('Failed to read config file:', error);
  }
  return null;
}

// Initialize database tables
function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      api_key TEXT,
      is_local INTEGER DEFAULT 0,
      auto_connect INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      external_id TEXT,
      name TEXT,
      yolo_mode INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      tool_name TEXT,
      tool_args TEXT,
      tool_result TEXT,
      tool_success INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      duration_ms REAL,
      created_at INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_server_id ON sessions(server_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `);

  // Read config from entrypoint-generated file (has API key)
  const config = readConfigFile();

  if (config && config.servers.length > 0) {
    // Sync servers from config file to database
    for (const server of config.servers) {
      const existing = sqlite.prepare('SELECT id FROM servers WHERE id = ?').get(server.id);
      const now = Math.floor(Date.now() / 1000);

      if (existing) {
        // Update existing server (sync API key)
        sqlite.prepare(`
          UPDATE servers SET
            name = ?,
            url = ?,
            api_key = ?,
            is_local = ?,
            auto_connect = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          server.name,
          server.url,
          server.apiKey || '',
          server.isLocal ? 1 : 0,
          server.autoConnect ? 1 : 0,
          now,
          server.id
        );
        console.log(`Updated server ${server.id} from config`);
      } else {
        // Insert new server
        sqlite.prepare(`
          INSERT INTO servers (id, name, url, api_key, is_local, auto_connect, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          server.id,
          server.name,
          server.url,
          server.apiKey || '',
          server.isLocal ? 1 : 0,
          server.autoConnect ? 1 : 0,
          now,
          now
        );
        console.log(`Created server ${server.id} from config`);
      }
    }
  } else {
    // Fallback: Create default local server if no config and no servers
    const serverCount = sqlite.prepare('SELECT COUNT(*) as count FROM servers').get() as { count: number };
    if (serverCount.count === 0) {
      const now = Math.floor(Date.now() / 1000);
      sqlite.prepare(`
        INSERT INTO servers (id, name, url, api_key, is_local, auto_connect, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'local',
        'Local Agent',
        'http://localhost:8081',
        '', // No API key - will need manual config
        1,
        1,
        now,
        now
      );
      console.log('Created default local server (no config file found)');
    }
  }
}

// Initialize on module load
initializeDatabase();

export { schema };
