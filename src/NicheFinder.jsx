// src/NicheFinder.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { phrasePatterns } from "./data/phrasePatterns";
import "./App.css";
import Footer from "./Footer";
// ── Constants ───────────────────────────────────────────────────────────
const SUGGESTION_PAGE_SIZE = 6 * 2;  // two rows of 6 each
const POSTS_PER_PAGE = 10;

// ── Springy Toggle ───────────────────────────────────────────────────────
const ToggleSwitch = ({ enabled, onToggle, label }) => (
  <div className="toggle-wrap" onClick={onToggle}>
    <motion.div
      className="toggle-track"
      animate={{ backgroundColor: enabled ? "#4caf50" : "#ccc" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div className="toggle-thumb" layout style={{ x: enabled ? 26 : 0 }} />
    </motion.div>
    <span className="toggle-label">{label}</span>
  </div>
);

export default function NicheFinder() {
  // ── State Hooks ────────────────────────────────────────────────────────
  const [topic, setTopic] = useState("");
  const [suggestedSubs, setSuggestedSubs] = useState([]);
  const [suggestionPage, setSuggestionPage] = useState(0);

  const [trackedSubs, setTrackedSubs] = useState([]);
  const [selectedSorts, setSelectedSorts] = useState(["hot"]);
  const [useSuggestedSubs, setUseSuggestedSubs] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [patternChoice, setPatternChoice] = useState("none");

  const [rawPosts, setRawPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [error, setError] = useState(null);

  // ── Fetch Subreddits ───────────────────────────────────────────────────
  const fetchSubreddits = useCallback(async (q) => {
    if (!q.trim()) {
      setSuggestedSubs([]);
      return;
    }
    try {
      const res = await fetch(
        `/.netlify/functions/search-subs?q=${encodeURIComponent(q)}&limit=100`
      );
      const { data } = await res.json();
      setSuggestedSubs(
        data.children
          .map((c) => ({ name: c.data.display_name, over18: c.data.over18 }))
          .filter((s) => !s.over18)
      );
    } catch {
      setSuggestedSubs([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSubreddits(topic), 300);
    return () => clearTimeout(t);
  }, [topic, fetchSubreddits]);

  useEffect(() => {
    setSuggestionPage(0);
  }, [suggestedSubs]);

  // ── Add / Remove Subs ─────────────────────────────────────────────────
  const addSub = (name) => {
    const lower = name.toLowerCase();
    if (!trackedSubs.includes(lower)) {
      setTrackedSubs((prev) => [...prev, lower]);
    }
  };
  const removeSub = (name) =>
    setTrackedSubs((prev) => prev.filter((s) => s !== name));

  // ── Sort toggle ────────────────────────────────────────────────────────
  const toggleSort = (type) => setSelectedSorts([type]);

  // ── Fetch posts helper ────────────────────────────────────────────────
  // now takes `sub`, `sort` AND a search-query `q`
  const fetchFor = useCallback(async (sub, sort, q) => {
    try {
      const url =
        `/.netlify/functions/search-posts?` +
        `sub=${encodeURIComponent(sub)}` +
        `&sort=${encodeURIComponent(sort)}` +
        `&q=${encodeURIComponent(q)}` +
        `&t=all` +
        `&limit=50`;

      console.log("🔗 fetchFor URL:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      return data.children.map((c) => ({
        subreddit: c.data.subreddit.toLowerCase(),
        title:     c.data.title,
        score:     c.data.score,
        url:       `https://reddit.com${c.data.permalink}`,
      }));
    } catch {
      return [];
    }
  }, []);

  // ── Execute search & error handling ───────────────────────────────────
const handleSearch = useCallback(async () => {
  setError(null);
  setLoadingPosts(true);

  // pick subs to search
  const subs = useSuggestedSubs
    ? Array.from(
        new Set([
          ...trackedSubs,
          ...suggestedSubs.map((s) => s.name.toLowerCase()),
        ])
      )
    : trackedSubs;

  if (!subs.length) {
    setRawPosts([]);
    setLoadingPosts(false);
    return;
  }

  try {
    // up to 3 posts per pattern when "All patterns" is selected
    let all = [];
    if (patternChoice === "all") {
      for (let txt of phrasePatterns) {
        let matches = [];
        for (let sub of subs) {
          // use first sort; extend loop if you want multiple sorts
          const posts = await fetchFor(sub, selectedSorts[0], txt);
          matches.push(...posts);
        }
        // dedupe and take at most 3
        const unique = Array.from(
          new Map(matches.map((p) => [p.url, p])).values()
        );
        all.push(...unique.slice(0, 3));
      }
    } else {
      // No pattern: fetch by keyword as before
      for (let sub of subs) {
        for (let sort of selectedSorts) {
          const posts = await fetchFor(sub, sort, keyword);
          all.push(...posts);
        }
      }
    }

    // dedupe globally by URL
    const seen = new Map();
    all.forEach((p) => seen.set(p.url, p));
    setRawPosts(Array.from(seen.values()));
  } catch (e) {
    console.error("handleSearch error:", e);
    setError("There was an error fetching posts. Please try again.");
  } finally {
    setLoadingPosts(false);
  }
}, [
  trackedSubs,
  suggestedSubs,
  useSuggestedSubs,
  selectedSorts,
  fetchFor,
  keyword,
  patternChoice,
]);


  // auto-search when sort, subs, or toggle changes
 // useEffect(() => {
//    if (trackedSubs.length || useSuggestedSubs) {
 //     handleSearch();
//    }
//  }, [selectedSorts, useSuggestedSubs, trackedSubs, handleSearch]);

  // ── Filter, Sort & Reset posts ───────────────────────────────────────
  useEffect(() => {
  const kw = keyword.trim().toLowerCase();

  let posts = [];
  if (patternChoice === "none") {
    // No pattern: all posts that match the keyword (or all if no kw)
    posts = rawPosts.filter((p) =>
      kw ? p.title.toLowerCase().includes(kw) : true
    );
  } else {
    // All patterns: up to 3 posts per pattern
    phrasePatterns.forEach((txt) => {
      const regex = new RegExp(`\\b${txt.replace(/ /g, "\\s+")}\\b`, "i");
      let matches = rawPosts.filter((p) => regex.test(p.title));

      // if they did type a keyword, apply it; otherwise skip
      if (kw) {
        matches = matches.filter((p) =>
          p.title.toLowerCase().includes(kw)
        );
      }

      // take at most 3 for this pattern
      posts.push(...matches.slice(0, 3));
    });
  }

  setFilteredPosts(posts);
  setResultPage(0);
}, [rawPosts, keyword, patternChoice]);


// ── Suggestions pagination ────────────────────────────────────────────
const untracked = suggestedSubs.filter(
  s => !trackedSubs.includes(s.name.toLowerCase())
);
const suggestionPageCount = Math.ceil(
  untracked.length / SUGGESTION_PAGE_SIZE
);
const visibleSuggestions = untracked.slice(
  suggestionPage * SUGGESTION_PAGE_SIZE,
  suggestionPage * SUGGESTION_PAGE_SIZE + SUGGESTION_PAGE_SIZE
);
  // ── Results pagination ────────────────────────────────────────────────
  const resultPageCount = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const pageResults = filteredPosts.slice(
    resultPage * POSTS_PER_PAGE,
    resultPage * POSTS_PER_PAGE + POSTS_PER_PAGE
  );

  // ── Reset everything ──────────────────────────────────────────────────
  const handleReset = () => {
    setTopic("");
    setSuggestedSubs([]);
    setTrackedSubs([]);
    setSelectedSorts(["hot"]);
    setKeyword("");
    setPatternChoice("none");
    setRawPosts([]);
    setFilteredPosts([]);
    setUseSuggestedSubs(false);
    setLoadingPosts(false);
    setSuggestionPage(0);
    setResultPage(0);
    setError(null);
  };

  return (
    <div className="App">
      {loadingPosts && (
        <div className="spinner-overlay">
          <div className="spinner" />
          {patternChoice === "all" && (
            <div className="loading-message">
              Selecting “All patterns” will take a bit longer. Please be patient…
            </div>
          )}
        </div>
      )}
<div className="poc-banner">
  <strong> MicroProblem Finder (Light Beta)</strong><br/>
  Proof-of-concept written by Eric T. Schmidt: React + Framer Motion front-end • Netlify Functions back-end<br/>
  2025-06-27 16:09:37 -0400 (first commit) 
</div>
      <h1>MicroProblem Finder (Light Beta)</h1>

      {/* Subreddit search */}
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Search subreddits…"
        className="filter-input"
      />

      {/* Suggestions */}
      {visibleSuggestions.length > 0 && (
        <LayoutGroup>
          <ul className="suggestions">
            <AnimatePresence>
              {visibleSuggestions.map((s) => (
                <motion.li
                  key={s.name}
                  layoutId={`sub-${s.name}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="suggestion"
                  onClick={() => addSub(s.name)}
                >
                  {s.name}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="pagination">
            <button
              disabled={suggestionPage === 0}
              onClick={() => setSuggestionPage((p) => p - 1)}
            >
              Prev
            </button>
            <span>
              Page {suggestionPage + 1} of {suggestionPageCount || 1}
            </span>
            <button
              disabled={suggestionPage + 1 >= suggestionPageCount}
              onClick={() => setSuggestionPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </LayoutGroup>
      )}

      {/* Tracked subs */}
      <div className="chips">
        <AnimatePresence>
          {trackedSubs.map((s) => (
            <motion.span
              key={s}
              layoutId={`sub-${s}`}
              className="chip"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => removeSub(s)}
            >
              {s} ×
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Sort */}
      <div className="sorts">
        {["hot", "new", "top"].map((type) => (
          <motion.button
            key={type}
            className={selectedSorts.includes(type) ? "on" : ""}
            onClick={() => toggleSort(type)}
            whileHover={{ scale: 1.1 }}
          >
            {type}
          </motion.button>
        ))}
      </div>

      {/* Filters & Toggle */}
      <div className="filters">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Filter titles…"
          className="filter-input short"
        />
        <select
          value={patternChoice}
          onChange={(e) => setPatternChoice(e.target.value)}
          className="filter-select"
        >
          <option value="none">No pattern</option>
          <option value="all">All patterns</option>
        </select>
        <ToggleSwitch
          enabled={useSuggestedSubs}
          onToggle={() => setUseSuggestedSubs((p) => !p)}
          label="Include suggested subs"
        />
      </div>

      {/* Actions */}
      <div className="actions">
        <motion.button
          onClick={handleSearch}
          className="btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={trackedSubs.length === 0 && !useSuggestedSubs}
        >
          Search Posts
        </motion.button>
        <motion.button
          onClick={handleReset}
          className="btn-secondary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
        >
          Reset
        </motion.button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Results */}
      <div className="results-section">
        {!loadingPosts && (
          <>
            <motion.ul
              className="results"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              {pageResults.map((p) => (
                <motion.li
                  key={p.url}
                  className="card"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 },
                  }}
                >
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.title}
                  </a>
                  <motion.span
                    key={`${p.url}-${p.score}`}
                    className="score"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    whileHover={{ scale: 1.2 }}
                  >
                    🔥 {p.score}
                  </motion.span>
                </motion.li>
              ))}
            </motion.ul>
            <div className="pagination">
              <button
                disabled={resultPage === 0}
                onClick={() => setResultPage((p) => p - 1)}
              >
                Prev
              </button>
              <span>
                Page {resultPage + 1} of {resultPageCount || 1}
              </span>
              <button
                disabled={resultPage + 1 >= resultPageCount}
                onClick={() => setResultPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
     <Footer />
    

    </div>
  );
}
