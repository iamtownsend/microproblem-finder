// netlify/functions/search-subs.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  // Allow preflight
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

  const { q = "", limit = "100" } = event.queryStringParameters || {};
  if (!q.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`q` parameter is required" }),
    };
  }

  const redditURL =
    `https://www.reddit.com/subreddits/search.json` +
    `?q=${encodeURIComponent(q)}` +
    `&limit=${encodeURIComponent(limit)}`;

  try {
    console.log("🔍 [search-subs] fetching:", redditURL);

    const res = await fetch(redditURL, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("❌ [search-subs]", res.status, text.slice(0, 500));
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Reddit API returned ${res.status}`,
          detail: text.slice(0, 500),
        }),
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("❌ [search-subs] JSON parse error:", parseErr);
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Invalid JSON from Reddit",
          detail: text.slice(0, 500),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("🔥 [search-subs] unexpected error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
