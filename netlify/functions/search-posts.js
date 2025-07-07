// netlify/functions/search-posts.js
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // 1) Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
    };
  }

  // 2) Pull params
  const { sub = "", sort = "top", t = "all", limit = "50", q = "" } =
    event.queryStringParameters || {};

  if (!sub.trim() || !q.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` and `q` are required" }),
    };
  }

  const redditUrl =
    `https://old.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?restrict_sr=true` +
    `&sort=${encodeURIComponent(sort)}` +
    `&t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&q=${encodeURIComponent(q)}`+
    `&raw_json=1`;

  try {
    console.log("🔍 [search-posts] fetching:", redditUrl);

    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });
    const text = await res.text();

    if (!res.ok) {
      console.error(
        `❌ [search-posts] reddit returned ${res.status}`,
        text.slice(0, 200)
      );
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Reddit API returned ${res.status}`,
          detail: text.slice(0, 200),
        }),
      };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("❌ [search-posts] parse error:", err);
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Invalid JSON from Reddit" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error("🔥 [search-posts] unexpected:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
