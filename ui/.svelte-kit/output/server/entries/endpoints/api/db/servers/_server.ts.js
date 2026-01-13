import { json } from "@sveltejs/kit";
import { d as db, s as servers } from "../../../../../chunks/index2.js";
import { eq } from "drizzle-orm";
const GET = async () => {
  try {
    const serversList = await db.select().from(servers).all();
    return json({ servers: serversList });
  } catch (error) {
    console.error("Failed to list servers:", error);
    return json({ error: "Failed to list servers" }, { status: 500 });
  }
};
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, url, apiKey, isLocal, autoConnect } = body;
    if (!name || !url) {
      return json({ error: "Name and URL are required" }, { status: 400 });
    }
    const id = `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = /* @__PURE__ */ new Date();
    await db.insert(servers).values({
      id,
      name,
      url: url.replace(/\/$/, ""),
      // Remove trailing slash
      apiKey: apiKey || null,
      isLocal: isLocal || false,
      autoConnect: autoConnect || false,
      createdAt: now,
      updatedAt: now
    });
    const newServer = await db.select().from(servers).where(eq(servers.id, id)).get();
    return json({ server: newServer }, { status: 201 });
  } catch (error) {
    console.error("Failed to create server:", error);
    return json({ error: "Failed to create server" }, { status: 500 });
  }
};
const PUT = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, url, apiKey, isLocal, autoConnect } = body;
    if (!id) {
      return json({ error: "Server ID is required" }, { status: 400 });
    }
    await db.update(servers).set({
      name,
      url: url?.replace(/\/$/, ""),
      apiKey,
      isLocal,
      autoConnect,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(servers.id, id));
    const updated = await db.select().from(servers).where(eq(servers.id, id)).get();
    return json({ server: updated });
  } catch (error) {
    console.error("Failed to update server:", error);
    return json({ error: "Failed to update server" }, { status: 500 });
  }
};
const DELETE = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return json({ error: "Server ID is required" }, { status: 400 });
    }
    const server = await db.select().from(servers).where(eq(servers.id, id)).get();
    if (server?.isLocal) {
      return json({ error: "Cannot delete local server" }, { status: 403 });
    }
    await db.delete(servers).where(eq(servers.id, id));
    return json({ success: true });
  } catch (error) {
    console.error("Failed to delete server:", error);
    return json({ error: "Failed to delete server" }, { status: 500 });
  }
};
export {
  DELETE,
  GET,
  POST,
  PUT
};
