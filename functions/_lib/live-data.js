// Serves the live dashboard data files from the R2 bucket bound as LIVE_DATA.
// The files are written hourly by publish_public.py in ~/code/global-solar-live and uploaded
// under the "public/" prefix; only names on that pattern are served, nothing else in the bucket.

const NAME = /^[a-z0-9_]{1,64}\.json$/;
const PREFIX = "public/";

const base = {
  "x-content-type-options": "nosniff",
  "cross-origin-resource-policy": "same-origin",
};

function text(status, body) {
  return new Response(body, { status, headers: { ...base, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export async function serveLiveData(request, env, name) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { ...base, allow: "GET, HEAD" } });
  }
  name = String(name || "");
  if (!NAME.test(name)) return text(404, "Not found");
  if (!env || !env.LIVE_DATA) return text(503, "Live data is not configured");

  const obj = await env.LIVE_DATA.get(PREFIX + name);
  if (!obj) return text(404, "Not found");

  const headers = {
    ...base,
    "content-type": "application/json; charset=utf-8",
    // The data changes once an hour: browsers keep it five minutes, the edge serves a stale copy while it refetches.
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    etag: obj.httpEtag,
  };
  if (obj.uploaded) headers["last-modified"] = new Date(obj.uploaded).toUTCString();

  const inm = request.headers.get("if-none-match");
  if (inm && inm === obj.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === "HEAD" ? null : obj.body, { status: 200, headers });
}
