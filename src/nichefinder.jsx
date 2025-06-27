// src/NicheFinder.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { phrasePatterns } from "./data/phrasePatterns";
import { starterSubreddits } from "./data/starterSubreddits";
import "./App.css";

// ── Pagination Constants ────────────────────────────────────────────────
const SUGGESTIONS_PER_ROW = 6;
const SUGGESTION_ROWS = 2;
const SUGGESTION_PAGE_SIZE = SUGGESTIONS_PER_ROW * SUGGESTION_ROWS; // 12 per page
const POSTS_PER_PAGE = 10;

// ── Springy Toggle ───────────────────────────────────────────────────────
const ToggleSwitch = ({ enabled, onToggle, label }) => (
  <div className="toggle-wrap" onClick={onToggle}>
    <motion.div
      className="toggle-track"
      animate={{ backgroundColor: enabled ? "#4caf50" : "#ccc" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div
        className="toggle-thumb"
        layout
        style={{ x: enabled ? 26 : 0 }}
      />
    </motion.div>
    <span className="toggle-label">{label}</span>
  </div>
);

export default function NicheFinder() {
  // 1️⃣ Search & Subs
  const [topic, setTopic] = useState("");
  const [suggestedSubs, setSuggestedSubs] = useState([]);

  // 1.5️⃣ Subs Pagination
  const [suggestionPage, setSuggestionPage] = useState(0);

  // 2️⃣ Tracked & Sort
  const [trackedSubs, setTrackedSubs] = useState([]);
  const [selectedSorts, setSelectedSorts] = useState(["top"]);
  const [useSuggestedSubs, setUseSuggestedSubs] = useState(false);

  // 3️⃣ Title Filters
  const [keyword, setKeyword] = useState("");
  const [patternChoice, setPatternChoice] = useState("all");

  // 4️⃣ Posts, Loading & Pagination
  const [rawPosts, setRawPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [resultPage, setResultPage] = useState(0);

  // ── Fetch Subreddits (public API + CRA proxy for dev) ───────────────
  const fetchSubreddits = useCallback(async (q) => {
    if (!q.trim()) {
      setSuggestedSubs([]);
      return;
    }
    try {
      const res = await fetch(
        `/subreddits/search.json?q=${encodeURIComponent(q)}&limit=100`
      );
      const { data } = await res.json();
      const sfw = data.children
        .map((c) => ({
          name: c.data.display_name,
          over18: c.data.over18,
        }))
        .filter((s) => !s.over18);
      setSuggestedSubs(sfw);
    } catch {
      setSuggestedSubs([]);
    }
  }, []);

  // debounce the subreddit search
  useEffect(() => {
    const t = setTimeout(() => fetchSubreddits(topic), 300);
    return () => clearTimeout(t);
  }, [topic, fetchSubreddits]);

  // reset suggestion page when list changes
  useEffect(() => {
    setSuggestionPage(0);
  }, [suggestedSubs]);

  // ── Add / Remove Subs ────────────────────────────────────────────────
  const addSub = (name) => {
    const lower = name.toLowerCase();
    if (!trackedSubs.includes(lower)) {
      setTrackedSubs((p) => [...p, lower]);
    }
  };
  const removeSub = (name) => {
    setTrackedSubs((p) => p.filter((s) => s !== name));
  };

  // ── Sort toggle (exactly one) ─────────────────────────────────────────
  const toggleSort = (type) => {
    setSelectedSorts([type]);
  };

  // ── Fetch posts helper ───────────────────────────────────────────────
  const fetchFor = useCallback(async (sub, sort) => {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/${sort}.json?limit=50&t=all`
      );
      const { data } = await res.json();
      return data.children.map((c) => ({
        subreddit: c.data.subreddit.toLowerCase(),
        title: c.data.title,
        score: c.data.score,
        url: `https://reddit.com${c.data.permalink}`,
        sort,
      }));
    } catch {
      return [];
    }
  }, []);

  // ── Execute the search ───────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoadingPosts(true);
    const subs = useSuggestedSubs
      ? Array.from(
          new Set([
            ...trackedSubs,
            ...starterSubreddits.map((s) => s.toLowerCase()),
          ])
        )
      : trackedSubs;

    if (!subs.length) {
      setRawPosts([]);
      setLoadingPosts(false);
      return;
    }

    let all = [];
    for (let sub of subs) {
      for (let sort of selectedSorts) {
        all = all.concat(await fetchFor(sub, sort));
      }
    }
    setRawPosts(all);
    setLoadingPosts(false);
  }, [trackedSubs, selectedSorts, useSuggestedSubs, fetchFor]);

  // auto-search when sort or suggested toggle changes
  useEffect(() => {
    if (trackedSubs.length || useSuggestedSubs) handleSearch();
  }, [selectedSorts, useSuggestedSubs, trackedSubs, handleSearch]);

  // ── Filter, Sort & Reset posts ───────────────────────────────────────
  useEffect(() => {
    let posts = [...rawPosts];
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      posts = posts.filter((p) => p.title.toLowerCase().includes(kw));
    }
    if (patternChoice === "all") {
      posts = posts.filter((p) =>
        phrasePatterns.some((txt) =>
          new RegExp(`\\b${txt.replace(/ /g, "\\s+")}\\b`, "i").test(
            p.title
          )
        )
      );
    } else if (patternChoice !== "none") {
      posts = posts.filter((p) =>
        new RegExp(
          `\\b${patternChoice.replace(/ /g, "\\s+")}\\b`,
          "i"
        ).test(p.title)
      );
    }
    // sort by descending flame count
    posts.sort((a, b) => b.score - a.score);
    setFilteredPosts(posts);
    setResultPage(0);
  }, [rawPosts, keyword, patternChoice]);

  // ── Suggestions: filter tracked out, then paginate ─────────────────
  const untracked = suggestedSubs.filter((s) =>
    !trackedSubs.includes(s.name.toLowerCase())
  );
  const suggestionPageCount = Math.ceil(
    untracked.length / SUGGESTION_PAGE_SIZE
  );
  const visibleSuggestions = untracked.slice(
    suggestionPage * SUGGESTION_PAGE_SIZE,
    suggestionPage * SUGGESTION_PAGE_SIZE + SUGGESTION_PAGE_SIZE
  );

  // ── Paginate posts ───────────────────────────────────────────────────
  const resultPageCount = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const pageResults = filteredPosts.slice(
    resultPage * POSTS_PER_PAGE,
    resultPage * POSTS_PER_PAGE + POSTS_PER_PAGE
  );

  // ── Reset everything ─────────────────────────────────────────────────
  const handleReset = () => {
    setTopic("");
    setSuggestedSubs([]);
    setTrackedSubs([]);
    setSelectedSorts(["top"]);
    setKeyword("");
    setPatternChoice("all");
    setRawPosts([]);
    setFilteredPosts([]);
    setUseSuggestedSubs(false);
    setLoadingPosts(false);
    setSuggestionPage(0);
    setResultPage(0);
  };

  return (
    <div className="App">
      {/* Spinner */}
      {loadingPosts && (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      )}

      <h1>MicroProblem Finder</h1>

      {/* Search */}
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Search subreddits…"
        className="filter-input"
      />

      {/* Suggestions Grid & Pagination */}
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

      {/* Tracked Chips */}
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
          {phrasePatterns.map((txt) => (
            <option key={txt} value={txt}>
              {txt}
            </option>
          ))}
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

      {/* Results & Pagination */}
      <div className="results-section">
        {loadingPosts ? (
          <div className="skeleton-container">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
          </div>
        ) : (
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
    </div>
  );
}
