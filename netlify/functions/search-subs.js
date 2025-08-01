// netlify/functions/search-subs.js

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
      // Basic auth per Reddit docs
      "Authorization": "Basic " +
        Buffer.from(`${id}:${secret}`).toString("base64"),
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
  // allow OPTIONS preflight
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

  const { q = "", limit = "100" } = event.queryStringParameters || {};
  if (!q.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`q` parameter is required" }),
    };
  }

  try {
    // 1) get a fresh bearer token
    const token = await getOAuthToken();

    // 2) do the actual search
    const redditURL = 
      `https://oauth.reddit.com/subreddits/search.json` +
      `?q=${encodeURIComponent(q)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&raw_json=1`;

    const res = await fetch(redditURL, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent":    "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error:  `Reddit API returned ${res.status}`,
          detail: text.slice(0,500),
        }),
      };
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error("[search-subs] error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
