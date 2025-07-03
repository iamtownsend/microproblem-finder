// netlify/functions/search-subs.js
// (or netlify/functions/search-subs/index.js – same contents)

const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  // Grab query params (q and limit)
  const { q = "", limit = "100" } = event.queryStringParameters || {};

  if (!q.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "`q` parameter is required" }),
    };
  }

  const redditURL = `https://www.reddit.com/subreddits/search.json` +
                    `?q=${encodeURIComponent(q)}` +
                    `&limit=${encodeURIComponent(limit)}`;

  try {
    console.log("🔍 [search-subs] fetching:", redditURL);

    const res = await fetch(redditURL, {
      headers: {
        // Reddit sometimes rejects blank or unknown User-Agents
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ [search-subs] reddit returned ${res.status}`, text.slice(0,500));
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error: `Reddit API returned ${res.status}`,
          detail: text.slice(0,500),
        }),
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("❌ [search-subs] JSON parse error:", parseErr, text.slice(0,500));
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Invalid JSON from Reddit",
          detail: text.slice(0,500),
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("🔥 [search-subs] unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
