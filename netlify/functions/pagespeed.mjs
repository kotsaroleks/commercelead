// Server-side proxy for the Google PageSpeed Insights API.
// Keeps PAGESPEED_API_KEY off the client, normalises the response, and prefers
// real-user CrUX field data (LCP) with a lab fallback.
//
// GET /.netlify/functions/pagespeed?url=<site>&strategy=mobile|desktop

const CACHE = new Map(); // url+strategy -> { at, body }
const TTL_MS = 30 * 60 * 1000; // PSI is slow (5–15s); cache warm instances for 30 min

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json", "cache-control": "public, max-age=600" },
  body: JSON.stringify(body),
});

export async function handler(event) {
  const params = event.queryStringParameters || {};
  let url = (params.url || "").trim();
  const strategy = params.strategy === "desktop" ? "desktop" : "mobile";

  if (!url) return json(400, { error: "Missing url parameter." });
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    new URL(url);
  } catch {
    return json(400, { error: "Invalid URL." });
  }

  const cacheKey = strategy + "|" + url;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) return json(200, cached.body);

  const key = process.env.PAGESPEED_API_KEY;
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.append("category", "performance");
  if (key) endpoint.searchParams.set("key", key);

  let data;
  try {
    const res = await fetch(endpoint.toString());
    data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || "PageSpeed Insights request failed.";
      return json(res.status === 429 ? 429 : 502, { error: msg });
    }
  } catch (e) {
    return json(502, { error: "Could not reach PageSpeed Insights." });
  }

  // Prefer CrUX field data (real users); fall back to lab (Lighthouse) metrics.
  const field = data.loadingExperience?.metrics || data.originLoadingExperience?.metrics || {};
  const fieldLcpMs = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const fieldFcpMs = field.FIRST_CONTENTFUL_PAINT_MS?.percentile;

  const audits = data.lighthouseResult?.audits || {};
  const labLcpMs = audits["largest-contentful-paint"]?.numericValue;
  const labFcpMs = audits["first-contentful-paint"]?.numericValue;

  const toS = (ms) => (typeof ms === "number" ? Math.round((ms / 1000) * 10) / 10 : null);

  const lcpField = toS(fieldLcpMs);
  const lcpLab = toS(labLcpMs);
  const lcp = lcpField != null ? lcpField : lcpLab;
  const fcp = toS(fieldFcpMs) != null ? toS(fieldFcpMs) : toS(labFcpMs);

  if (lcp == null) return json(422, { error: "No LCP metric available for this URL." });

  const body = {
    url,
    strategy,
    lcp,
    fcp,
    source: lcpField != null ? "field" : "lab",
    finalUrl: data.lighthouseResult?.finalUrl || url,
  };

  CACHE.set(cacheKey, { at: Date.now(), body });
  return json(200, body);
}
