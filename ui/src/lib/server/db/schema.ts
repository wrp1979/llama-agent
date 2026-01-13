import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Servers table - stores agent server configurations
export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  apiKey: text('api_key'),
  isLocal: integer('is_local', { mode: 'boolean' }).default(false),
  autoConnect: integer('auto_connect', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Sessions table - stores chat sessions linked to servers
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  externalId: text('external_id'), // session_id from llama-agent-server
  name: text('name'),
  yoloMode: integer('yolo_mode', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Messages table - stores all messages/interactions in a session
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  // Tool-specific fields
  toolName: text('tool_name'),
  toolArgs: text('tool_args'), // JSON string
  toolResult: text('tool_result'),
  toolSuccess: integer('tool_success', { mode: 'boolean' }),
  // Metadata
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  durationMs: real('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Relations
export const serversRelations = relations(servers, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  server: one(servers, {
    fields: [sessions.serverId],
    references: [servers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

// Types
export type Server = typeof servers.$inferSelect;
export type NewServer = typeof servers.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
