// src/Footer.jsx
import React from "react";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <div>
        © {year} Your Name. All rights reserved.
      </div>
      <div className="legal-links">
        {/* If you add them, link to your full LICENSE, TOS, or Privacy Policy */}
        <a href="/LICENSE">License</a>
        &nbsp;|&nbsp;
        <a href="/terms">Terms of Service</a>
        &nbsp;|&nbsp;
        <a href="/privacy">Privacy Policy</a>
      </div>
    </footer>
  );
}
