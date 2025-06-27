import fs from 'fs';
import path from 'path';
import stringSimilarity from 'string-similarity';

export default function handler(req, res) {
  const { topic } = req.query;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Load subreddit index from public/data
  const filePath = path.join(process.cwd(), 'public', 'data', 'subredditIndex.json');
  let subs = [];

  try {
    const file = fs.readFileSync(filePath, 'utf8');
    subs = JSON.parse(file);
  } catch (err) {
    return res.status(500).json({ error: 'Could not read subreddit index.' });
  }

  // Create array of descriptions to match against
  const descriptions = subs.map(sub =>
    `${sub.title || ''} ${sub.description || ''}`.toLowerCase()
  );

  const matches = stringSimilarity.findBestMatches(topic.toLowerCase(), descriptions);

  // Join similarity scores back to subreddit objects
  const topMatches = matches.ratings
    .map((rating, i) => ({
      name: subs[i].name,
      title: subs[i].title,
      description: subs[i].description,
      score: rating.rating,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  res.status(200).json({ matches: topMatches });
}
