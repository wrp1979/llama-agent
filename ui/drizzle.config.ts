import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH || '/data/llama-agent.db',
  },
} satisfies Config;
