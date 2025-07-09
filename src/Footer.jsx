// src/Footer.jsx
import React from "react";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <div>
        © {year} Eric T. Schmidt. All rights reserved.
      </div>
      <div className="legal-links">
        All rights reserved. No part of this software may be reproduced or used in any form without permission.
        {/* Uncomment these if you have legal pages */}    
        {/* If you add them, link to your full LICENSE, TOS, or Privacy Policy 
             {/*   <a href="/LICENSE">License</a>
        &nbsp;|&nbsp;
        <a href="/terms">Terms of Service</a>
        &nbsp;|&nbsp;
        <a href="/privacy">Privacy Policy</a>*/}
      </div>
    </footer>
  );
}
