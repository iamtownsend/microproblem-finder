const fetch = require("node-fetch");

exports.handler = async function(event) {
  const { sub, sort, t, limit, q } = event.queryStringParameters;
  const redditUrl = 
    `https://www.reddit.com/r/${sub}/search.json` +
    `?restrict_sr=true` +
    `&sort=${sort}` +
    `&t=${t}` +
    `&limit=${limit}` +
    `&q=${q}`;

  try {
    const res = await fetch(redditUrl);
    if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
    const json = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(json)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
