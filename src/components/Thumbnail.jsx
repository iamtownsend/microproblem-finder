import React, { useState } from "react";

const Thumbnail = ({ src, alt, size = 80 }) => {
  const [status, setStatus] = useState("loading"); // "loading" | "loaded" | "error"

  if (status === "error") return null;

  return (
    <div
      className="thumb-wrapper"
      style={{ width: size, height: size, position: "relative", background: "#f0f0f0" }}
    >
      {status === "loading" && (
        <div
          className="thumb-spinner"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 16,
            height: 16,
            margin: -8,
            border: "2px solid #ccc",
            borderTopColor: "#333",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        style={{
          display: status === "loaded" ? "block" : "none",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
};

export default Thumbnail;
