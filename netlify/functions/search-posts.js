// netlify/functions/search-posts.js

const fetch = require("node-fetch");

const CLIENT_ID     = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

exports.handler = async (event, context) => {
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

  const { sub, sort = "top", t = "all", limit = "50", q = "" } =
    event.queryStringParameters || {};

  if (!sub.trim() || !q.trim()) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` and `q` parameters are required" }),
    };
  }

  // 1) fetch OAuth2 token
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  let tokenJson;
  try {
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) throw new Error(`Token fetch failed ${tokenRes.status}`);
    tokenJson = await tokenRes.json();
  } catch (err) {
    console.error("🔥 [search-posts] token error:", err);
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to fetch Reddit token" }),
    };
  }

  const accessToken = tokenJson.access_token;

  // 2) perform the search
  const searchUrl =
    `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?restrict_sr=true&sort=${encodeURIComponent(sort)}` +
    `&t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent":    "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ [search-posts] reddit returned ${res.status}`, text.slice(0,500));
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Reddit returned ${res.status}`, detail: text.slice(0,500) }),
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
