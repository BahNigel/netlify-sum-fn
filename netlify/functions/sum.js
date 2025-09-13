exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  let data = {};

  try {
    if (event.httpMethod === "POST") {
      const ct = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
      if (ct.includes("application/json")) {
        try { data = JSON.parse(event.body || "{}"); }
        catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(event.body || "");
        for (const [k, v] of params.entries()) {
          const n = Number(v); data[k] = Number.isFinite(n) ? n : v;
        }
      } else if (ct.includes("text/plain")) {
        try { data = JSON.parse(event.body || "{}"); } catch { data = {}; }
      } else {
        try { data = JSON.parse(event.body || "{}"); } catch { data = {}; }
      }
    } else if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      for (const [k, v] of Object.entries(qs)) {
        const n = Number(v); data[k] = Number.isFinite(n) ? n : v;
      }
    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Use POST (JSON/form) or GET (query)" }) };
    }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const sum = Object.values(data).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
  return { statusCode: 200, headers, body: JSON.stringify({ sum }) };
};
