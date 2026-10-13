// janus-preview: a stable front door for Janus previews.
// Cloudflare version uploads each get a one-off URL; this worker reads
// the newest one's URL from KV (key "preview:latest_url", written by
// the agent after every `wrangler versions upload`) and 302-redirects
// to it, preserving path + query. Myles bookmarks ONE address:
// https://janus-preview.mylezlan3.workers.dev
export default {
  async fetch(request, env) {
    const target = await env.PREVIEW_KV.get("preview:latest_url");
    if (!target) {
      return new Response("No Janus preview has been published yet.", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const incoming = new URL(request.url);
    const dest = new URL(incoming.pathname + incoming.search, target);
    return Response.redirect(dest.toString(), 302);
  },
};
