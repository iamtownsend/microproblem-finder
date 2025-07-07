// netlify/functions/search-posts.js

const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  // CORS pre-flight
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

  // grab & validate
  const {
    sub = "",
    sort = "top",
    t = "all",
    limit = "50",
  } = event.queryStringParameters || {};

  if (!sub.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` is required" }),
    };
  }

  // build a listing URL instead of search
  const redditUrl =
    `https://www.reddit.com/r/${encodeURIComponent(sub)}/${encodeURIComponent(sort)}.json` +
    `?t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}`;

  try {
    console.log("🔍 [search-posts] fetching listing:", redditUrl);
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ [search-posts] reddit returned ${res.status}`);
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Reddit returned ${res.status}`,
          detail: text.slice(0,300),
        }),
      };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse error", err);
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
    console.error("🔥 unexpected error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
