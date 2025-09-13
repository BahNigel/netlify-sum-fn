// A minimal chat proxy. If LLM_API_KEY is set, it calls an OpenAI-compatible
// chat endpoint (LLM_BASE_URL, default OpenAI). Otherwise it returns a fallback.

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST with JSON body" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  // Accept both {prompt: "..."} and {messages:[{role,content},...]}
  const messages = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : [{ role: "user", content: String(body.prompt ?? "") }];

  const apiKey  = process.env.LLM_API_KEY;                           // set in Netlify UI if you have one
  const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model   = process.env.LLM_MODEL   || "gpt-4o-mini";          // or any OpenAI-compatible model name

  // Fallback (works even without any API key)
  if (!apiKey) {
    const userText = messages.find(m => m.role === "user")?.content || "";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ provider: "local-fallback", reply: `Echo: ${userText}` })
    };
  }

  // Call an OpenAI-compatible Chat Completions API
  try {
    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      })
    });

    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.output_text ??
      data?.generated_text ??
      text;

    return { statusCode: 200, headers, body: JSON.stringify({ provider: baseUrl, reply, raw: data }) };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Upstream error", detail: String(e) }) };
  }
};
