// netlify/functions/search-posts.js
const fetch = require("node-fetch");

const CLIENT_ID     = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

// helper: get an app-only bearer token
async function getBearerToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Token fetch failed: HTTP ${res.status}`);
  }
  const { access_token } = await res.json();
  if (!access_token) {
    throw new Error("No access_token in Reddit response");
  }
  return access_token;
}

exports.handler = async function(event) {
  // parse & validate
  const {
    sub = "",
    sort = "top",
    t   = "all",
    limit = "50",
    q = "",
  } = event.queryStringParameters || {};

  if (!sub.trim() || !q.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "`sub` and `q` parameters are required",
      }),
    };
  }

  try {
    // 1) get OAuth bearer
    const token = await getBearerToken();

    // 2) perform the search
    const redditUrl =
      `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/search` +
      `?restrict_sr=true` +
      `&sort=${encodeURIComponent(sort)}` +
      `&t=${encodeURIComponent(t)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&q=${encodeURIComponent(q)}`;

    const res = await fetch(redditUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      // bubble up Reddit error code & body
      const text = await res.text();
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error: `Reddit returned ${res.status}`,
          detail: text.slice(0,200),
        }),
      };
    }

    const json = await res.json();
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
