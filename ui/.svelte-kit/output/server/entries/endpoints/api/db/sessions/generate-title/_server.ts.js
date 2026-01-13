import { json } from "@sveltejs/kit";
import { d as db, a as sessions, s as servers } from "../../../../../../chunks/index2.js";
import { eq } from "drizzle-orm";
function getServerSideUrl(url) {
  return url.replace("localhost:8081", "llama:8081").replace("127.0.0.1:8081", "llama:8081");
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, prompt } = body;
    if (!sessionId || !prompt) {
      return json({ error: "sessionId and prompt are required" }, { status: 400 });
    }
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session || !session.externalId) {
      return json({ error: "Session not found" }, { status: 404 });
    }
    const server = await db.select().from(servers).where(eq(servers.id, session.serverId)).get();
    if (!server) {
      return json({ error: "Server not found" }, { status: 404 });
    }
    const titlePrompt = `Generate a very short title (3-6 words max, no more than 40 characters) that summarizes this user message. Return ONLY the title text, nothing else. No quotes, no explanation, no punctuation at the end.

User message: "${prompt.slice(0, 300)}"`;
    const headers = {
      "Content-Type": "application/json"
    };
    if (server.apiKey) {
      headers["Authorization"] = `Bearer ${server.apiKey}`;
    }
    const serverUrl = getServerSideUrl(server.url);
    const response = await fetch(`${serverUrl}/v1/agent/session/${session.externalId}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: titlePrompt })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM request failed:", errorText);
      return json({ error: "LLM request failed" }, { status: 500 });
    }
    const title = await parseSSEResponse(response);
    const cleanTitle = cleanupTitle(title);
    await db.update(sessions).set({ name: cleanTitle, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, sessionId));
    return json({ title: cleanTitle });
  } catch (error) {
    console.error("Failed to generate title:", error);
    return json({ error: "Failed to generate title" }, { status: 500 });
  }
};
async function parseSSEResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantContent = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content && typeof parsed.content === "string") {
            assistantContent += parsed.content;
          }
        } catch {
        }
      }
    }
  }
  return assistantContent;
}
function cleanupTitle(title) {
  let clean = title.trim();
  clean = clean.replace(/^["'`]|["'`]$/g, "");
  clean = clean.replace(/^title:\s*/i, "");
  clean = clean.replace(/[.!?]+$/, "");
  if (clean.length > 45) {
    clean = clean.slice(0, 42) + "...";
  }
  return clean || "New Session";
}
export {
  POST
};
