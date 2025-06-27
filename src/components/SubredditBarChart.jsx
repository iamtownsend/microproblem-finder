import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SubredditBarChart = ({
  trackedSubs = [],
  selectedSorts = [],
  postCache = {},
  patterns = [],
  selectedPattern = "",
}) => {
  // build data for chart
  const data = trackedSubs.map((sub) => {
    const count = selectedSorts.reduce((sum, sort) => {
      const posts = postCache[`${sub}_${sort}`] ?? [];
      const matches = selectedPattern
        ? posts.filter((p) => {
            const pat = patterns.find((x) => x.text === selectedPattern);
            return pat?.re.test(p.title);
          })
        : posts;
      return sum + (matches?.length ?? 0);
    }, 0);
    return { name: sub, count };
  });

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Subreddit Chart</h2>
      {data.every((d) => d.count === 0) ? (
        <p>No data to chart.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SubredditBarChart;
