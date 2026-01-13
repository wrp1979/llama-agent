import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname } from "path";
const servers = sqliteTable("servers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  apiKey: text("api_key"),
  isLocal: integer("is_local", { mode: "boolean" }).default(false),
  autoConnect: integer("auto_connect", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date())
});
const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => servers.id, { onDelete: "cascade" }),
  externalId: text("external_id"),
  // session_id from llama-agent-server
  name: text("name"),
  yoloMode: integer("yolo_mode", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date())
});
const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  // Tool-specific fields
  toolName: text("tool_name"),
  toolArgs: text("tool_args"),
  // JSON string
  toolResult: text("tool_result"),
  toolSuccess: integer("tool_success", { mode: "boolean" }),
  // Metadata
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  durationMs: real("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date())
});
const serversRelations = relations(servers, ({ many }) => ({
  sessions: many(sessions)
}));
const sessionsRelations = relations(sessions, ({ one, many }) => ({
  server: one(servers, {
    fields: [sessions.serverId],
    references: [servers.id]
  }),
  messages: many(messages)
}));
const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id]
  })
}));
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  messages,
  messagesRelations,
  servers,
  serversRelations,
  sessions,
  sessionsRelations
}, Symbol.toStringTag, { value: "Module" }));
const DB_PATH = process.env.DB_PATH || "/data/llama-agent.db";
const CONFIG_PATH = "/app/config/servers.json";
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch {
    console.warn(`Could not create directory ${dbDir}, using fallback`);
  }
}
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });
function readConfigFile() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn("Failed to read config file:", error);
  }
  return null;
}
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
  const config = readConfigFile();
  if (config && config.servers.length > 0) {
    for (const server of config.servers) {
      const existing = sqlite.prepare("SELECT id FROM servers WHERE id = ?").get(server.id);
      const now = Math.floor(Date.now() / 1e3);
      if (existing) {
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
          server.apiKey || "",
          server.isLocal ? 1 : 0,
          server.autoConnect ? 1 : 0,
          now,
          server.id
        );
        console.log(`Updated server ${server.id} from config`);
      } else {
        sqlite.prepare(`
          INSERT INTO servers (id, name, url, api_key, is_local, auto_connect, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          server.id,
          server.name,
          server.url,
          server.apiKey || "",
          server.isLocal ? 1 : 0,
          server.autoConnect ? 1 : 0,
          now,
          now
        );
        console.log(`Created server ${server.id} from config`);
      }
    }
  } else {
    const serverCount = sqlite.prepare("SELECT COUNT(*) as count FROM servers").get();
    if (serverCount.count === 0) {
      const now = Math.floor(Date.now() / 1e3);
      sqlite.prepare(`
        INSERT INTO servers (id, name, url, api_key, is_local, auto_connect, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "local",
        "Local Agent",
        "http://localhost:8081",
        "",
        // No API key - will need manual config
        1,
        1,
        now,
        now
      );
      console.log("Created default local server (no config file found)");
    }
  }
}
initializeDatabase();
export {
  sessions as a,
  db as d,
  messages as m,
  servers as s
};
