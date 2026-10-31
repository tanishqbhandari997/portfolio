(() => {
  if (document.querySelector(".portfolio-nav")) return;

  const style = document.createElement("style");
  style.textContent = `
    .portfolio-nav {
      position: relative;
      z-index: 1000;
      display: flex;
      min-height: 46px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px max(18px, calc((100% - 1180px) / 2));
      border-bottom: 1px solid rgba(32, 58, 52, .12);
      background: #f6f4ed;
      color: #203a34;
      font: 600 13px/1.3 "Segoe UI", Inter, Arial, sans-serif;
    }
    .portfolio-nav a {
      color: inherit;
      text-decoration: none;
    }
    .portfolio-nav a:hover { text-decoration: underline; }
    .portfolio-nav a:focus-visible,
    .portfolio-nav select:focus-visible {
      outline: 3px solid #bb805e;
      outline-offset: 3px;
    }
    .portfolio-nav-label { color: #71817a; font-size: 11px; }
    @media (max-width: 520px) {
      .portfolio-nav { padding-inline: 14px; }
      .portfolio-nav-label { display: none; }
    }
  `;
  document.head.append(style);
  const nav = document.createElement("nav");
  nav.className = "portfolio-nav";
  nav.setAttribute("aria-label", "Portfolio navigation");
  nav.innerHTML = '<a href="./index.html">← Back to portfolio</a><span class="portfolio-nav-label">Project demo</span><span id="demo-profile-slot"></span>';
  document.body.prepend(nav);
})();
