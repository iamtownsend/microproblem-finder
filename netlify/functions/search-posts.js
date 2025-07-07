// netlify/functions/search-posts.js

const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  // 1) Allow CORS preflight
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

  // 2) Grab & validate query params
  const {
    sub = "",
    sort = "top",
    t = "all",
    limit = "50",
    q = "",
  } = event.queryStringParameters || {};

  if (!sub.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` parameter is required" }),
    };
  }

  // 3) Build Reddit URL
  const redditUrl =
    `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?restrict_sr=true` +
    `&sort=${encodeURIComponent(sort)}` +
    `&t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&q=${encodeURIComponent(q)}`;

  try {
    // 4) Fetch from Reddit with a proper User-Agent
    console.log("🔍 [search-posts] fetching:", redditUrl);
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ [search-posts] reddit returned ${res.status}`, text.slice(0, 500));
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Reddit API returned ${res.status}`,
          detail: text.slice(0, 500),
        }),
      };
    }

    // 5) Parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("❌ [search-posts] JSON parse error:", parseErr);
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Invalid JSON from Reddit",
          detail: text.slice(0, 500),
        }),
      };
    }

    // 6) Return success
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("🔥 [search-posts] unexpected error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
