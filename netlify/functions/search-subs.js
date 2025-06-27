// netlify/functions/search-subs.js

// If you need fetch in Node <18, install node-fetch. On Netlify Node 18+ you can use the global fetch.
const fetch = global.fetch || require("node-fetch");

exports.handler = async function (event, context) {
  const { q = "", limit = "100" } = event.queryStringParameters || {};

  // Query Reddit’s public API
  const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(
    q
  )}&limit=${limit}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
