// netlify/functions/search-subs.js
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // CORS preflight
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
    `https://old.reddit.com/subreddits/search.json` +
    `?q=${encodeURIComponent(q)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&raw_json=1`;

  try {
    console.log("🔍 [search-subs] fetching:", redditURL);
    const res = await fetch(redditURL, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        Accept: "application/json",
      },
    });
    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ [search-subs] reddit returned ${res.status}`, text.slice(0, 200));
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Reddit API returned ${res.status}` }),
      };
    }

    const data = JSON.parse(text);
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
