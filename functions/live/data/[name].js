// Cloudflare Pages Function: GET /live/data/<name>.json
// The public copies of the live energy dashboard data, read from R2 (binding LIVE_DATA).
import { serveLiveData } from "../../_lib/live-data.js";

export function onRequest({ request, env, params }) {
  return serveLiveData(request, env, params.name);
}
