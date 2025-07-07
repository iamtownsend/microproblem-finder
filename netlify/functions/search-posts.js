// netlify/functions/search-posts.js
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
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

  const { sub = "", sort = "top", t = "all", limit = "50", q = "" } =
    event.queryStringParameters || {};

  if (!sub) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` parameter is required" }),
    };
  }

  const redditURL =
    `https://old.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?restrict_sr=true` +
    `&sort=${encodeURIComponent(sort)}` +
    `&t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&q=${encodeURIComponent(q)}` +
    `&raw_json=1`;

  try {
    console.log("🔍 [search-posts] fetching:", redditURL);
    const res = await fetch(redditURL, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        Accept: "application/json",
      },
    });
    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ [search-posts] reddit returned ${res.status}`, text.slice(0, 200));
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Reddit API returned ${res.status}` }),
      };
    }

    const json = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(json),
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
