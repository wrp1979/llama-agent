import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, asc } from 'drizzle-orm';

// GET /api/db/messages - List messages for a session
export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    const messagesList = await db.select()
      .from(schema.messages)
      .where(eq(schema.messages.sessionId, sessionId))
      .orderBy(asc(schema.messages.createdAt))
      .all();

    return json({ messages: messagesList });
  } catch (error) {
    console.error('Failed to list messages:', error);
    return json({ error: 'Failed to list messages' }, { status: 500 });
  }
};

// POST /api/db/messages - Create a new message
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      sessionId,
      role,
      content,
      toolName,
      toolArgs,
      toolResult,
      toolSuccess,
      inputTokens,
      outputTokens,
      durationMs,
    } = body;

    if (!sessionId || !role || content === undefined) {
      return json({ error: 'Session ID, role, and content are required' }, { status: 400 });
    }

    // Validate role
    if (!['user', 'assistant', 'system', 'tool'].includes(role)) {
      return json({ error: 'Invalid role' }, { status: 400 });
    }

    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.insert(schema.messages).values({
      id,
      sessionId,
      role,
      content,
      toolName: toolName || null,
      toolArgs: toolArgs ? JSON.stringify(toolArgs) : null,
      toolResult: toolResult || null,
      toolSuccess: toolSuccess ?? null,
      inputTokens: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      durationMs: durationMs ?? null,
      createdAt: new Date(),
    });

    const newMessage = await db.select().from(schema.messages).where(eq(schema.messages.id, id)).get();
    return json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Failed to create message:', error);
    return json({ error: 'Failed to create message' }, { status: 500 });
  }
};

// POST /api/db/messages/batch - Create multiple messages at once
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages: messagesToInsert } = body;

    if (!Array.isArray(messagesToInsert) || messagesToInsert.length === 0) {
      return json({ error: 'Messages array is required' }, { status: 400 });
    }

    const insertValues = messagesToInsert.map((msg) => ({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: msg.sessionId,
      role: msg.role,
      content: msg.content,
      toolName: msg.toolName || null,
      toolArgs: msg.toolArgs ? JSON.stringify(msg.toolArgs) : null,
      toolResult: msg.toolResult || null,
      toolSuccess: msg.toolSuccess ?? null,
      inputTokens: msg.inputTokens ?? null,
      outputTokens: msg.outputTokens ?? null,
      durationMs: msg.durationMs ?? null,
      createdAt: new Date(),
    }));

    await db.insert(schema.messages).values(insertValues);

    return json({ success: true, count: insertValues.length });
  } catch (error) {
    console.error('Failed to batch create messages:', error);
    return json({ error: 'Failed to batch create messages' }, { status: 500 });
  }
};

// DELETE /api/db/messages - Delete a message or all messages in a session
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, sessionId } = body;

    if (sessionId) {
      // Delete all messages in session
      await db.delete(schema.messages).where(eq(schema.messages.sessionId, sessionId));
      return json({ success: true });
    }

    if (id) {
      // Delete single message
      await db.delete(schema.messages).where(eq(schema.messages.id, id));
      return json({ success: true });
    }

    return json({ error: 'Either message ID or session ID is required' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete message(s):', error);
    return json({ error: 'Failed to delete message(s)' }, { status: 500 });
  }
};
