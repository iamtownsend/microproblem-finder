// netlify/functions/search-posts.js
const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  const {
    sub,
    sort = "top",
    t = "all",
    limit = "50",
    q = ""
  } = event.queryStringParameters || {};

  // sub is required
  if (!sub) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "`sub` parameter is required" }),
    };
  }

  // Build the Reddit URL depending on whether we're searching or just listing
  let redditUrl;
  if (q.trim()) {
    // search within the subreddit
    redditUrl = 
      `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json` +
      `?restrict_sr=true` +
      `&sort=${encodeURIComponent(sort)}` +
      `&t=${encodeURIComponent(t)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&q=${encodeURIComponent(q)}`;
  } else {
    // just pull the subreddit listing
    redditUrl =
      `https://www.reddit.com/r/${encodeURIComponent(sub)}/${encodeURIComponent(sort)}.json` +
      `?limit=${encodeURIComponent(limit)}` +
      `&t=${encodeURIComponent(t)}`;
  }

  try {
    console.log(`🔍 [search-posts] fetching: ${redditUrl}`);
    const res = await fetch(redditUrl, {
      headers: {
        // supply a real UA
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        "Accept": "application/json",
      },
    });

    // bubble up any HTTP errors
    if (!res.ok) {
      throw new Error(`Reddit returned ${res.status}`);
    }

    const json = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error("🔥 [search-posts] error:", err);
    return {
      statusCode: err.message.startsWith("Reddit returned")
        ? 502
        : 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
