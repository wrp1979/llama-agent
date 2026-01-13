import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

// GET /api/db/servers - List all servers
export const GET: RequestHandler = async () => {
  try {
    const serversList = await db.select().from(schema.servers).all();
    return json({ servers: serversList });
  } catch (error) {
    console.error('Failed to list servers:', error);
    return json({ error: 'Failed to list servers' }, { status: 500 });
  }
};

// POST /api/db/servers - Create a new server
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, url, apiKey, isLocal, autoConnect } = body;

    if (!name || !url) {
      return json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const id = `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    await db.insert(schema.servers).values({
      id,
      name,
      url: url.replace(/\/$/, ''), // Remove trailing slash
      apiKey: apiKey || null,
      isLocal: isLocal || false,
      autoConnect: autoConnect || false,
      createdAt: now,
      updatedAt: now,
    });

    const newServer = await db.select().from(schema.servers).where(eq(schema.servers.id, id)).get();
    return json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error('Failed to create server:', error);
    return json({ error: 'Failed to create server' }, { status: 500 });
  }
};

// PUT /api/db/servers - Update a server
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, url, apiKey, isLocal, autoConnect } = body;

    if (!id) {
      return json({ error: 'Server ID is required' }, { status: 400 });
    }

    await db.update(schema.servers)
      .set({
        name,
        url: url?.replace(/\/$/, ''),
        apiKey,
        isLocal,
        autoConnect,
        updatedAt: new Date(),
      })
      .where(eq(schema.servers.id, id));

    const updated = await db.select().from(schema.servers).where(eq(schema.servers.id, id)).get();
    return json({ server: updated });
  } catch (error) {
    console.error('Failed to update server:', error);
    return json({ error: 'Failed to update server' }, { status: 500 });
  }
};

// DELETE /api/db/servers - Delete a server
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return json({ error: 'Server ID is required' }, { status: 400 });
    }

    // Check if it's a local server (don't allow deletion)
    const server = await db.select().from(schema.servers).where(eq(schema.servers.id, id)).get();
    if (server?.isLocal) {
      return json({ error: 'Cannot delete local server' }, { status: 403 });
    }

    await db.delete(schema.servers).where(eq(schema.servers.id, id));
    return json({ success: true });
  } catch (error) {
    console.error('Failed to delete server:', error);
    return json({ error: 'Failed to delete server' }, { status: 500 });
  }
};
