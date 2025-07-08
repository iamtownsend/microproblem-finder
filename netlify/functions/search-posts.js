// netlify/functions/search-posts.js
const fetch = require("node-fetch");

exports.handler = async function (event) {
  // pull in our query params (provide defaults)
  const { sub, sort = "top", t = "all", limit = "50", q = "" } =
    event.queryStringParameters || {};

  // `sub` is required
  if (!sub) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "`sub` parameter is required" }),
    };
  }

  // decide which Reddit endpoint to call:
  //  • if `q` is nonempty → search in-subreddits
  //  • otherwise → regular listing
  const redditUrl = q.trim()
    ? `https://www.reddit.com/r/${sub}/search.json` +
      `?restrict_sr=true&sort=${sort}&t=${t}&limit=${limit}` +
      `&q=${encodeURIComponent(q)}`
    : `https://www.reddit.com/r/${sub}/${sort}.json` +
      `?limit=${limit}&t=${t}`;

  try {
    const res = await fetch(redditUrl, {
      headers: {
        "User-Agent": "NetlifyFunction/1.0 reddit-niche-ui",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      // propagate Reddit’s HTTP errors (403, etc.)
      throw new Error(`Reddit returned ${res.status}`);
    }

    const json = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

