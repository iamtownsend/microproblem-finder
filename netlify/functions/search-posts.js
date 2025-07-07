// netlify/functions/search-posts.js
const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  const {
    sub,
    sort = "top",
    t = "all",
    limit = "50",
    q = "",
  } = event.queryStringParameters || {};

  if (!sub) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "`sub` parameter is required" }),
    };
  }

  let redditUrl;
  const base = `https://www.reddit.com/r/${encodeURIComponent(sub)}`;
  const commonParams = `limit=${encodeURIComponent(limit)}&t=${encodeURIComponent(t)}&raw_json=1`;

  if (q.trim()) {
    // search endpoint
    redditUrl =
      `${base}/search.json?restrict_sr=true` +
      `&sort=${encodeURIComponent(sort)}` +
      `&q=${encodeURIComponent(q)}` +
      `&${commonParams}`;
  } else {
    // listing endpoint
    redditUrl =
      `${base}/${encodeURIComponent(sort)}.json?` +
      commonParams;
  }

  try {
    console.log("🔍 [search-posts] fetching:", redditUrl);
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        "Accept": "application/json",
        "Referer": "https://www.reddit.com/",
      },
    });

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
      statusCode: 502,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
