import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';

// GET /api/db/sessions - List sessions (optionally filtered by server)
export const GET: RequestHandler = async ({ url }) => {
  try {
    const serverId = url.searchParams.get('serverId');

    let query = db.select().from(schema.sessions).orderBy(desc(schema.sessions.createdAt));

    if (serverId) {
      query = query.where(eq(schema.sessions.serverId, serverId)) as typeof query;
    }

    const sessionsList = await query.all();
    return json({ sessions: sessionsList });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return json({ error: 'Failed to list sessions' }, { status: 500 });
  }
};

// POST /api/db/sessions - Create a new session
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { serverId, externalId, name, yoloMode } = body;

    if (!serverId) {
      return json({ error: 'Server ID is required' }, { status: 400 });
    }

    // Check if server exists
    const server = await db.select().from(schema.servers).where(eq(schema.servers.id, serverId)).get();
    if (!server) {
      return json({ error: 'Server not found' }, { status: 404 });
    }

    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();

    await db.insert(schema.sessions).values({
      id,
      serverId,
      externalId: externalId || null,
      name: name || `Session ${new Date().toLocaleString()}`,
      yoloMode: yoloMode ?? true,
      createdAt: now,
      updatedAt: now,
    });

    const newSession = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
    return json({ session: newSession }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return json({ error: 'Failed to create session' }, { status: 500 });
  }
};

// PUT /api/db/sessions - Update a session
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, externalId, name, yoloMode } = body;

    if (!id) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (externalId !== undefined) updates.externalId = externalId;
    if (name !== undefined) updates.name = name;
    if (yoloMode !== undefined) updates.yoloMode = yoloMode;

    await db.update(schema.sessions)
      .set(updates)
      .where(eq(schema.sessions.id, id));

    const updated = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
    return json({ session: updated });
  } catch (error) {
    console.error('Failed to update session:', error);
    return json({ error: 'Failed to update session' }, { status: 500 });
  }
};

// DELETE /api/db/sessions - Delete a session
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return json({ error: 'Failed to delete session' }, { status: 500 });
  }
};
