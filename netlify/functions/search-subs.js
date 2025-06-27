// netlify/functions/search-subs.js

exports.handler = async function (event, context) {
  const { q = "", limit = "100" } = event.queryStringParameters || {};

  // Build the Reddit API URL
  const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(
    q
  )}&limit=${limit}`;

  try {
    // Use the global fetch (available in Netlify Node18+)
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
