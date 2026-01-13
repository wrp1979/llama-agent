import { json } from "@sveltejs/kit";
import { d as db, a as sessions, s as servers } from "../../../../../chunks/index2.js";
import { desc, eq } from "drizzle-orm";
const GET = async ({ url }) => {
  try {
    const serverId = url.searchParams.get("serverId");
    let query = db.select().from(sessions).orderBy(desc(sessions.createdAt));
    if (serverId) {
      query = query.where(eq(sessions.serverId, serverId));
    }
    const sessionsList = await query.all();
    return json({ sessions: sessionsList });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return json({ error: "Failed to list sessions" }, { status: 500 });
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { serverId, externalId, name, yoloMode } = body;
    if (!serverId) {
      return json({ error: "Server ID is required" }, { status: 400 });
    }
    const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (!server) {
      return json({ error: "Server not found" }, { status: 404 });
    }
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = /* @__PURE__ */ new Date();
    await db.insert(sessions).values({
      id,
      serverId,
      externalId: externalId || null,
      name: name || `Session ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
      yoloMode: yoloMode ?? true,
      createdAt: now,
      updatedAt: now
    });
    const newSession = await db.select().from(sessions).where(eq(sessions.id, id)).get();
    return json({ session: newSession }, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return json({ error: "Failed to create session" }, { status: 500 });
  }
};
const PUT = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, externalId, name, yoloMode } = body;
    if (!id) {
      return json({ error: "Session ID is required" }, { status: 400 });
    }
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (externalId !== void 0) updates.externalId = externalId;
    if (name !== void 0) updates.name = name;
    if (yoloMode !== void 0) updates.yoloMode = yoloMode;
    await db.update(sessions).set(updates).where(eq(sessions.id, id));
    const updated = await db.select().from(sessions).where(eq(sessions.id, id)).get();
    return json({ session: updated });
  } catch (error) {
    console.error("Failed to update session:", error);
    return json({ error: "Failed to update session" }, { status: 500 });
  }
};
const DELETE = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return json({ error: "Session ID is required" }, { status: 400 });
    }
    await db.delete(sessions).where(eq(sessions.id, id));
    return json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return json({ error: "Failed to delete session" }, { status: 500 });
  }
};
export {
  DELETE,
  GET,
  POST,
  PUT
};
