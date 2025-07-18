const fetch = require("node-fetch");

// Helper: grab an app-only token via client_credentials
async function getOAuthToken() {
  const id     = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Missing Reddit OAuth credentials");
  }

  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OAuth token error: HTTP ${resp.status} – ${txt.slice(0,200)}`);
  }

  const { access_token } = await resp.json();
  return access_token;
}

exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  // parse & validate
  const {
    sub    = "",
    sort   = "top",
    t      = "all",
    limit  = "25",
    q      = "",
  } = event.queryStringParameters || {};

  if (!sub.trim() || !q.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` and `q` parameters are required" }),
    };
  }

  // if there's a query, default to relevance
  const effectiveSort = q.trim() ? "relevance" : sort;

  try {
    const token = await getOAuthToken();

    // build the URL (note the “.json”)
    const redditUrl =
      `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
      `?q=${encodeURIComponent(`"${q}"`)}` +      // wrap search in quotes
      `&restrict_sr=1` +
      `&sort=${encodeURIComponent(effectiveSort)}` +
      `&t=${encodeURIComponent(t)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&raw_json=1`;

    const res = await fetch(redditUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent":  "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: text.slice(0,200) }),
      };
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("[search-posts] error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
