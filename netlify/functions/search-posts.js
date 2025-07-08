// netlify/functions/search-posts.js

const fetch = require("node-fetch");

let _token = null;
let _tokenExpiresAt = 0;

// Fetch a fresh OAuth token if needed
async function getToken() {
  const now = Date.now();
  if (_token && now < _tokenExpiresAt) {
    return _token;
  }

  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Missing Reddit OAuth credentials");
  }

  const creds = Buffer.from(`${id}:${secret}`).toString("base64");
  const resp = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Token fetch failed ${resp.status}: ${txt}`);
  }

  const { access_token, expires_in } = await resp.json();
  _token = access_token;
  // Subtract a small buffer so we never use an expired token
  _tokenExpiresAt = now + (expires_in * 1000) - 10_000;
  return _token;
}

exports.handler = async function(event) {
  // Allow CORS preflight
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

  const { sub, sort = "top", t = "all", limit = "25", q } = event.queryStringParameters || {};

  if (!sub || !q) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "`sub` and `q` parameters are required" }),
    };
  }

  let token;
  try {
    token = await getToken();
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: `OAuth failure: ${err.message}` }),
    };
  }

  const url =
    `https://oauth.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
    `?restrict_sr=true` +
    `&sort=${encodeURIComponent(sort)}` +
    `&t=${encodeURIComponent(t)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui"
      }
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: `Reddit returned ${res.status}`,
          detail: text.slice(0, 500)
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: text, // already JSON
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
