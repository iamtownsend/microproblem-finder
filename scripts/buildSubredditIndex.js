const fs = require('fs-extra');

const OUT_FILE = './data/subredditIndex.json';
const LIMIT = 100; // Max allowed per request
const TOTAL = 5000;
const WAIT = 1100; // Respect Reddit's 1 request/sec rule

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSubreddits(after = '') {
  const url = `https://www.reddit.com/subreddits.json?limit=${LIMIT}&after=${after}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'niche-finder-bot/0.1' }
  });

  if (!res.ok) {
    throw new Error(`Failed fetch: ${res.status}`);
  }

  const json = await res.json();
  return {
    subs: json.data.children.map((c) => ({
      name: c.data.display_name,
      title: c.data.title,
      description: c.data.public_description,
      subscribers: c.data.subscribers,
      over18: c.data.over18,
      lang: c.data.lang || 'en',
    })),
    after: json.data.after
  };
}

(async () => {
  let allSubs = [];
  let after = '';
  let count = 0;

  console.log(`🔄 Fetching subreddit metadata...`);

  while (allSubs.length < TOTAL && after !== null) {
    try {
      const { subs, after: nextAfter } = await fetchSubreddits(after);
      allSubs.push(...subs);
      after = nextAfter;
      count += subs.length;

      console.log(`📦 Collected ${count}...`);
      await sleep(WAIT);
    } catch (err) {
      console.error('❌ Error:', err.message);
      break;
    }
  }

  console.log(`💾 Writing ${allSubs.length} entries to ${OUT_FILE}`);
  await fs.outputJson(OUT_FILE, allSubs, { spaces: 2 });
  console.log('✅ Done!');
})();
