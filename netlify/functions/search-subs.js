// netlify/functions/search-subs.js

const fetch = require("node-fetch");  // <-- pull in node-fetch

exports.handler = async function(event, context) {
  const { q = "", limit = "100" } = event.queryStringParameters || {};
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
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
