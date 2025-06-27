import React, { useState, useEffect, useCallback } from "react";
import { phrasePatterns } from "./data/phrasePatterns";
import PostList from "./components/PostList";
//import SubredditBarChart from "./components/SubredditBarChart";
import "./App.css";

// === Constants ===
// PAGE_SIZE: Number of subreddit suggestions to display per page
const PAGE_SIZE = 20;

// === Main Application Component ===
// This React component encapsulates the entire 'Reddit Niche Finder' UI and logic.
const App = () => {
  // ▶️ === State Declarations ===
  // topic: current text input for subreddit search
  const [topic, setTopic] = useState("");
  // includeNSFW: whether to include NSFW subreddits in suggestions
  const [includeNSFW, setIncludeNSFW] = useState(false);
  // suggestedSubs: list of subreddit suggestions based on "topic"
  const [suggestedSubs, setSuggestedSubs] = useState([]);
  // page: current page index for suggestions pagination
  const [page, setPage] = useState(0);

  // trackedSubs: subreddits the user has selected (chips)
  const [trackedSubs, setTrackedSubs] = useState([]);
  // selectedSorts: which Reddit sort types to fetch (hot, new, top)
  const [selectedSorts, setSelectedSorts] = useState(["top"]);

  // keyword: filter text to apply to fetched post titles
  const [keyword, setKeyword] = useState("");
  // patternChoice: which phrase pattern to filter by (none, all, or specific)
  const [patternChoice, setPatternChoice] = useState("all");

  // rawPosts: posts fetched from Reddit before filtering
  const [rawPosts, setRawPosts] = useState([]);
  // filteredPosts: posts after applying keyword & pattern filters
  const [filteredPosts, setFilteredPosts] = useState([]);

// ▶️ === 1️⃣ Live‐search for subreddits as user types "topic" ===
// new state hooks:
const [subAfter, setSubAfter] = useState(null);
const [hasMore, setHasMore] = useState(false);

const fetchSubreddits = useCallback(
  async (q) => {
    if (!q.trim()) {
      // reset everything if input is empty
      setSuggestedSubs([]);
      setSubAfter(null);
      setHasMore(false);
      return;
    }
    try {
      // fetch first page of up to 100 subs
      const url = new URL(
        `https://www.reddit.com/subreddits/search.json`
      );
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "100");

      const res = await fetch(url);
      const json = await res.json();

      // map & filter as before
      const all = json.data.children.map((c) => ({
        name:   c.data.display_name,
        over18: c.data.over18,
      }));
      const sfw  = all.filter((s) => !s.over18);
      const nsfw = includeNSFW ? all.filter((s) => s.over18) : [];
      setSuggestedSubs([...sfw, ...nsfw]);

      // store Reddit's `after` cursor for paging
      setSubAfter(json.data.after);
      setHasMore(!!json.data.after);
    } catch {
      setSuggestedSubs([]);
      setSubAfter(null);
      setHasMore(false);
    }
  },
  [includeNSFW]
);

const loadMoreSubreddits = useCallback(async () => {
  if (!topic.trim() || !subAfter) return;
  try {
    // fetch the *next* page
    const url = new URL(
      `https://www.reddit.com/subreddits/search.json`
    );
    url.searchParams.set("q", topic);
    url.searchParams.set("limit", "100");
    url.searchParams.set("after", subAfter);

    const res = await fetch(url);
    const json = await res.json();

    const more = json.data.children.map((c) => ({
      name:   c.data.display_name,
      over18: c.data.over18,
    }));
    const sfw  = more.filter((s) => !s.over18);
    const nsfw = includeNSFW ? more.filter((s) => s.over18) : [];

    setSuggestedSubs((prev) => [...prev, ...sfw, ...nsfw]);
    setSubAfter(json.data.after);
    setHasMore(!!json.data.after);
  } catch {
    setHasMore(false);
  }
}, [topic, subAfter, includeNSFW]);

// debounce initial fetch on topic change
useEffect(() => {
  const tm = setTimeout(() => fetchSubreddits(topic), 300);
  return () => clearTimeout(tm);
}, [topic, fetchSubreddits]);

// when includeNSFW flips, re-run the exact same search
useEffect(() => {
  if (topic.trim()) fetchSubreddits(topic);
}, [includeNSFW, topic, fetchSubreddits]);

// reset pagination whenever suggestions totally change
useEffect(() => {
  setPage(0);
}, [suggestedSubs]);

  // ▶️ === 2️⃣ Handlers to add / remove tracked subreddits "chips" ===
  const addSub = (name) => {
    // Normalize to lowercase to avoid duplicates
    const lower = name.toLowerCase();
    if (!trackedSubs.includes(lower)) {
      setTrackedSubs((prev) => [...prev, lower]);
    }
  };
  const removeSub = (name) => {
    // Remove the given subreddit from trackedSubs
    setTrackedSubs((prev) => prev.filter((s) => s !== name));
  };

  // ▶️ === 3️⃣ Toggle which sort types are active ===
  const toggleSort = (type) =>
    setSelectedSorts((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]
    );

// ▶️ === 4️⃣ Helper to fetch posts from one subreddit+sort pair ===
  const fetchFor = useCallback(async (sub, sort) => {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/${sort}.json?limit=50&t=all`
      );
      const json = await res.json();

      return json.data.children.map((c) => {
        const d = c.data;
        let thumb = null;

        // 1) thumbnail field
        if (d.thumbnail?.startsWith("http")) {
          thumb = d.thumbnail;
        }
        // 2) direct image posts
        else if (d.post_hint === "image" && d.url_overridden_by_dest) {
          thumb = d.url_overridden_by_dest;
        }
        // 3) preview fallback
        else if (
          d.preview?.images?.[0]?.source?.url
        ) {
          thumb = d.preview.images[0].source.url;
        }

        // Sanitize & enforce HTTPS
        if (thumb) {
          thumb = thumb.replace(/&amp;/g, "&");
          if (thumb.startsWith("http://")) {
            thumb = thumb.replace(/^http:\/\//, "https://");
          }
        }

        return {
          subreddit: d.subreddit.toLowerCase(),
          title: d.title,
          score: d.score,
          url: `https://reddit.com${d.permalink}`,
          sort,
          thumbnail: thumb,  // null if none found
        };
      });
    } catch {
      // On error, return empty list
      return [];
    }
  }, []); // ← make sure this dependency array stays here!  
      
  // ▶️ 5.1️⃣ Reset everything back to its initial state
  const handleReset = () => {
    setTopic("");                    // clear subreddit search
    setIncludeNSFW(false);           // uncheck NSFW
    setSuggestedSubs([]);            // clear suggestions
    setPage(0);                      // back to page 1
    setTrackedSubs([]);              // remove all chips
    setSelectedSorts(["top"]);       // reset sorts
    setKeyword("");                  // clear title filter
    setPatternChoice("all");         // reset pattern dropdown
    setRawPosts([]);                 // clear fetched posts
    setFilteredPosts([]);            // clear displayed posts
};


  // ▶️ === 5️⃣ Manual "Search Posts" button handler ===
  const handleSearch = useCallback(async () => {
    // If no subs or no sorts selected, clear posts
    if (!trackedSubs.length || !selectedSorts.length) {
      setRawPosts([]);
      return;
    }
    let all = [];
    // For each tracked subreddit and each sort, fetch posts
    for (let sub of trackedSubs) {
      for (let sort of selectedSorts) {
        const posts = await fetchFor(sub, sort);
        all = all.concat(posts);
      }
    }
    // Store raw fetched posts
    setRawPosts(all);
  }, [trackedSubs, selectedSorts, fetchFor]);

  // ▶️ === 6️⃣ Apply keyword + phrase‐pattern filtering ===
  useEffect(() => {
    let posts = rawPosts;

    // 1. Keyword filter
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      posts = posts.filter((p) => p.title.toLowerCase().includes(kw));
    }

    // 2. Pattern filter:
    if (patternChoice === "none") {
      // no further filtering
    } else if (patternChoice === "all") {
      // match any of the patterns
      posts = posts.filter((p) =>
        phrasePatterns.some((txt) =>
          new RegExp(`\\b${txt.replace(/ /g, `\\s+`)}\\b`, "i").test(
            p.title
          )
        )
      );
    } else {
      // match exactly the selected patternChoice
      posts = posts.filter((p) =>
        new RegExp(
          `\\b${patternChoice.replace(/ /g, `\\s+`)}\\b`,
          "i"
        ).test(p.title)
      );
    }

    // Update filteredPosts state
    setFilteredPosts(posts);
  }, [rawPosts, keyword, patternChoice]);

  // ▶️ === 7️⃣ Filter out NSFW & paginate subreddit suggestions list ===
  // only keep non-NSFW when includeNSFW is false
  const visibleSubs = includeNSFW
    ? suggestedSubs
    : suggestedSubs.filter((s) => !s.over18);

  // now paginate that filtered list
  const pageCount = Math.ceil(visibleSubs.length / PAGE_SIZE);
  const displayed = visibleSubs.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  // ▶️ === Render JSX ===
  return (
    <div className="App">
      <h1>Reddit Niche Finder</h1>

      {/* Live‐search input & NSFW toggle */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Search subreddits…"
        />
        <label>
          <input
            type="checkbox"
            checked={includeNSFW}
            onChange={() => setIncludeNSFW((v) => !v)}
          />{' '}
          Include NSFW
        </label>
      </div>

{/* Subreddit suggestions list + pagination controls */}
{displayed.length > 0 && (
  <>
    <ul className="suggestions">
      {displayed.map((s) => (
        <li key={s.name} onClick={() => addSub(s.name)}>
          {s.name} {s.over18 && <em>(NSFW)</em>}
        </li>
      ))}
    </ul>

    {hasMore && (
      <button className="load-more" onClick={loadMoreSubreddits}>
        Load more…
      </button>
    )}

    <div className="pagination">
      <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
        Prev
      </button>
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button
        disabled={page + 1 >= pageCount}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </button>
    </div>
  </>
)}

      {/* Selected subreddits displayed as "chips" with remove buttons */}
      <div className="chips">
        {trackedSubs.map((s) => (
          <span key={s} className="chip">
            {s} <button onClick={() => removeSub(s)}>×</button>
          </span>
        ))}
      </div>

      {/* Sort toggle buttons (hot / new / top) */}
      <div className="sorts">
        {['hot', 'new', 'top'].map((type) => (
          <button
            key={type}
            className={selectedSorts.includes(type) ? 'on' : ''}
            onClick={() => toggleSort(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Keyword input + phrase pattern selector */}
      <div className="filters">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Filter titles…"
        />
        <select
          value={patternChoice}
          onChange={(e) => setPatternChoice(e.target.value)}
        >
          <option value="none">No pattern</option>
          <option value="all">All patterns</option>
          {phrasePatterns.map((txt) => (
            <option key={txt} value={txt}>
              {txt}
            </option>
          ))}
        </select>
      </div>

      {/* Manual Search Posts button + Reset Button */}
      <div style={{ margin: "1rem 0", display: "flex", gap: "1rem" }}>
        <button onClick={handleSearch}>Search Posts</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      {/* Display fetched & filtered posts */}
      <PostList posts={filteredPosts} />
    {/*  <SubredditBarChart posts={filteredPosts} />*/}
    
    </div>
  );
};

export default App;