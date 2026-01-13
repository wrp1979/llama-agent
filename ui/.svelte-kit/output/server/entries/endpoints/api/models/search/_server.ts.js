import { json } from "@sveltejs/kit";
const HF_API_BASE = "https://huggingface.co/api";
const GGUF_AUTHORS = ["bartowski", "unsloth", "TheBloke", "QuantFactory", "mlx-community"];
const GET = async ({ url }) => {
  try {
    const query = url.searchParams.get("q") || "";
    const author = url.searchParams.get("author") || "";
    const limit = parseInt(url.searchParams.get("limit") || "20");
    let apiUrl;
    if (query) {
      apiUrl = `${HF_API_BASE}/models?search=${encodeURIComponent(query + " GGUF")}&sort=downloads&direction=-1&limit=${limit}`;
    } else if (author) {
      apiUrl = `${HF_API_BASE}/models?author=${encodeURIComponent(author)}&sort=downloads&direction=-1&limit=${limit}`;
    } else {
      const results = [];
      for (const auth of GGUF_AUTHORS.slice(0, 3)) {
        try {
          const response2 = await fetch(
            `${HF_API_BASE}/models?author=${auth}&sort=downloads&direction=-1&limit=10`,
            { headers: { "Accept": "application/json" } }
          );
          if (response2.ok) {
            const models2 = await response2.json();
            for (const model of models2) {
              if (model.tags?.includes("gguf")) {
                results.push(transformModel(model));
              }
            }
          }
        } catch (e) {
          console.error(`Failed to fetch from ${auth}:`, e);
        }
      }
      results.sort((a, b) => b.downloads - a.downloads);
      return json({ models: results.slice(0, limit) });
    }
    const response = await fetch(apiUrl, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      return json({ error: "Failed to fetch models", models: [] }, { status: 500 });
    }
    const data = await response.json();
    const models = data.filter((m) => {
      const tags = m.tags || [];
      const id = m.id || "";
      return tags.includes("gguf") || id.toLowerCase().includes("gguf");
    }).map(transformModel).slice(0, limit);
    return json({ models });
  } catch (error) {
    console.error("Model search error:", error);
    return json({ error: "Search failed", models: [] }, { status: 500 });
  }
};
function transformModel(m) {
  const id = m.id || "";
  const parts = id.split("/");
  return {
    id,
    author: parts[0] || "",
    name: parts[1] || id,
    downloads: m.downloads || 0,
    likes: m.likes || 0,
    tags: m.tags || [],
    lastModified: m.lastModified || ""
  };
}
export {
  GET
};
