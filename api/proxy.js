// Vercel same-origin API gateway. It keeps opaque session cookies on the
// frontend domain while Railway remains the API and hosted-demo fixture host.
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function apiPath(req) {
  const value = req.query?.path;
  const segments = Array.isArray(value) ? value : [value];
  const path = segments.filter(Boolean).join("/");
  if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === ".."))
    return null;
  return `/api/${path}`;
}

function requestQuery(req) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (key === "path" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      query.append(key, String(item));
  }
  return query;
}

export default async function handler(req, res) {
  const apiOrigin = (process.env.RAILWAY_API_ORIGIN ?? "").replace(/\/$/, "");
  const path = apiPath(req);
  if (!path) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
    return;
  }
  if (!apiOrigin.startsWith("https://")) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: { code: "API_PROXY_CONFIGURATION" } }));
    return;
  }

  const target = new URL(path, `${apiOrigin}/`);
  target.search = requestQuery(req).toString();
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (
      value === undefined ||
      name === "host" ||
      hopByHopHeaders.has(name.toLowerCase())
    )
      continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  try {
    const method = req.method ?? "GET";
    const hasBody = !["GET", "HEAD"].includes(method);
    const body =
      hasBody && req.body !== undefined
        ? Buffer.isBuffer(req.body) || typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body)
        : hasBody
          ? req
          : undefined;
    if (hasBody && req.body !== undefined) {
      headers.delete("content-length");
      if (!headers.has("content-type"))
        headers.set("content-type", "application/json");
    }
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      duplex: hasBody && req.body === undefined ? "half" : undefined,
      redirect: "manual",
    });
    res.statusCode = upstream.status;
    for (const [name, value] of upstream.headers) {
      if (name !== "set-cookie" && !hopByHopHeaders.has(name))
        res.setHeader(name, value);
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    else if (upstream.headers.has("set-cookie"))
      res.setHeader("Set-Cookie", upstream.headers.get("set-cookie"));
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: { code: "API_UNAVAILABLE" } }));
  }
}
