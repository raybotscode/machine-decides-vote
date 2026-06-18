(function () {
  const DEFAULT_MOUNT_ID = "machine-decides-vote";
  const currentScript = document.currentScript;
  const apiBase =
    currentScript?.dataset.apiBase ||
    currentScript?.src?.replace(/\/widget\.js(?:\?.*)?$/, "") ||
    "";
  const mountId = currentScript?.dataset.mount || DEFAULT_MOUNT_ID;

  const css = `
    :root {
      --mdv-bg: #0a0a0a;
      --mdv-panel: #141414;
      --mdv-panel-strong: #1f1f1f;
      --mdv-text: #e8d5b7;
      --mdv-muted: #a79982;
      --mdv-accent: #2dd4bf;
      --mdv-accent-dark: #168f82;
      --mdv-border: #33302b;
      --mdv-danger: #f87171;
      --mdv-font: ui-monospace, "SFMono-Regular", "Cascadia Mono", "Roboto Mono", "Segoe UI Mono", monospace;
    }

    .mdv-root {
      box-sizing: border-box;
      width: 100%;
      background: var(--mdv-bg);
      color: var(--mdv-text);
      font-family: var(--mdv-font);
      padding: 24px;
      border: 1px solid var(--mdv-border);
    }

    .mdv-root *,
    .mdv-root *::before,
    .mdv-root *::after {
      box-sizing: inherit;
    }

    .mdv-topbar {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--mdv-border);
      padding-bottom: 16px;
    }

    .mdv-title {
      margin: 0;
      color: var(--mdv-text);
      font-size: clamp(20px, 3vw, 36px);
      line-height: 1.05;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .mdv-timer {
      min-width: 220px;
      color: var(--mdv-accent);
      text-align: right;
      font-size: 14px;
      line-height: 1.4;
      text-transform: uppercase;
    }

    .mdv-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .mdv-card {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-width: 0;
      overflow: hidden;
      background: var(--mdv-panel);
      border: 1px solid var(--mdv-border);
      border-radius: 8px;
    }

    .mdv-card img {
      display: block;
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      background: var(--mdv-panel-strong);
    }

    .mdv-card-body {
      padding: 14px;
    }

    .mdv-card h3 {
      margin: 0 0 8px;
      color: var(--mdv-text);
      font-size: 18px;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .mdv-card p {
      margin: 0;
      color: var(--mdv-muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .mdv-vote-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-top: 1px solid var(--mdv-border);
    }

    .mdv-button {
      appearance: none;
      border: 1px solid var(--mdv-accent);
      background: var(--mdv-accent);
      color: #041311;
      cursor: pointer;
      border-radius: 6px;
      min-height: 42px;
      padding: 0 14px;
      font: 700 14px/1 var(--mdv-font);
      text-transform: uppercase;
    }

    .mdv-button:hover:not(:disabled) {
      background: #5eead4;
      border-color: #5eead4;
    }

    .mdv-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .mdv-count {
      color: var(--mdv-text);
      font-size: 14px;
      white-space: nowrap;
    }

    .mdv-status {
      margin-top: 14px;
      min-height: 20px;
      color: var(--mdv-muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .mdv-status[data-tone="error"] {
      color: var(--mdv-danger);
    }

    .mdv-archive {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--mdv-border);
    }

    .mdv-section-title {
      margin: 0 0 12px;
      color: var(--mdv-accent);
      font-size: 16px;
      line-height: 1.2;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .mdv-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .mdv-mini {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--mdv-border);
      border-radius: 8px;
      background: var(--mdv-panel);
    }

    .mdv-mini img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: var(--mdv-panel-strong);
    }

    .mdv-mini div {
      padding: 10px;
    }

    .mdv-mini strong,
    .mdv-mini span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mdv-mini strong {
      color: var(--mdv-text);
      font-size: 13px;
    }

    .mdv-mini span {
      margin-top: 4px;
      color: var(--mdv-muted);
      font-size: 12px;
    }

    .mdv-empty {
      color: var(--mdv-muted);
      font-size: 13px;
      border: 1px dashed var(--mdv-border);
      padding: 14px;
      border-radius: 8px;
    }

    @media (max-width: 900px) {
      .mdv-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .mdv-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 620px) {
      .mdv-root {
        padding: 16px;
      }

      .mdv-topbar {
        display: block;
      }

      .mdv-timer {
        min-width: 0;
        margin-top: 10px;
        text-align: left;
      }

      .mdv-grid,
      .mdv-strip {
        grid-template-columns: 1fr;
      }
    }
  `;

  function install() {
    injectStyles();

    let mount = document.getElementById(mountId);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = mountId;
      currentScript?.insertAdjacentElement("afterend", mount) || document.body.appendChild(mount);
    }

    const app = new VotingWidget(mount);
    app.init();
  }

  class VotingWidget {
    constructor(mount) {
      this.mount = mount;
      this.week = null;
      this.designs = [];
      this.archive = { winners: [], nominees: [] };
      this.countdownId = null;
    }

    async init() {
      this.mount.innerHTML = `<div class="mdv-root"><div class="mdv-empty">Loading vote...</div></div>`;

      try {
        const [week, results, archive] = await Promise.all([
          getJSON("/api/current-week"),
          getJSON("/api/results"),
          getJSON("/api/archive").catch(() => ({ winners: [], nominees: [] }))
        ]);

        this.week = week;
        this.designs = results.designs || week.designs || [];
        this.archive = archive;
        this.render();
      } catch (error) {
        this.renderError(error.message || "Unable to load voting data.");
      }
    }

    render() {
      const winner = this.week.winner || this.designs.find((design) => design.id === this.week.winner_id);
      const isClosed = this.week.status === "closed";
      const title = isClosed
        ? `VOTING CLOSED - WINNER: ${winner ? escapeHTML(winner.title) : "TBD"}`
        : `WEEK ${escapeHTML(this.week.id)} - VOTE NOW`;

      this.mount.innerHTML = `
        <section class="mdv-root" aria-live="polite">
          <div class="mdv-topbar">
            <h2 class="mdv-title">${title}</h2>
            <div class="mdv-timer" data-mdv-timer></div>
          </div>
          <div class="mdv-grid">
            ${this.designs.length ? this.designs.map((design) => this.cardTemplate(design, isClosed)).join("") : `<div class="mdv-empty">No designs have been added for this week.</div>`}
          </div>
          <div class="mdv-status" data-mdv-status></div>
          ${this.archiveTemplate("Winners", this.archive.winners)}
          ${this.archiveTemplate("Past Nominees", this.archive.nominees)}
        </section>
      `;

      this.mount.querySelectorAll("[data-mdv-vote]").forEach((button) => {
        button.addEventListener("click", () => this.vote(button.dataset.mdvVote));
      });

      this.updateCountdown();
      clearInterval(this.countdownId);
      this.countdownId = setInterval(() => this.updateCountdown(), 1000);
    }

    cardTemplate(design, isClosed) {
      return `
        <article class="mdv-card">
          <img src="${escapeAttr(design.image_url)}" alt="${escapeAttr(design.title)}" loading="lazy">
          <div class="mdv-card-body">
            <h3>${escapeHTML(design.title)}</h3>
            <p>${escapeHTML(design.description || "")}</p>
          </div>
          <div class="mdv-vote-row">
            <button class="mdv-button" type="button" data-mdv-vote="${escapeAttr(design.id)}" ${isClosed ? "disabled" : ""}>Upvote</button>
            <span class="mdv-count" data-mdv-count="${escapeAttr(design.id)}">${Number(design.votes || 0)} votes</span>
          </div>
        </article>
      `;
    }

    archiveTemplate(title, items) {
      return `
        <section class="mdv-archive">
          <h3 class="mdv-section-title">${title}</h3>
          ${
            items?.length
              ? `<div class="mdv-strip">${items.map((item) => this.archiveItemTemplate(item)).join("")}</div>`
              : `<div class="mdv-empty">No ${title.toLowerCase()} yet.</div>`
          }
        </section>
      `;
    }

    archiveItemTemplate(item) {
      return `
        <article class="mdv-mini">
          <img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.title)}" loading="lazy">
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <span>Week ${escapeHTML(item.week_id || "")} - ${Number(item.votes || 0)} votes</span>
          </div>
        </article>
      `;
    }

    async vote(designId) {
      this.setStatus("Recording vote...");
      this.setButtons(true);

      try {
        const response = await fetch(`${apiBase}/api/vote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ design_id: designId })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Vote failed.");
        }

        const results = await getJSON("/api/results");
        this.designs = results.designs || this.designs;
        this.week = { ...this.week, ...(results.week || {}) };
        this.render();
        this.setStatus("Vote recorded.");
      } catch (error) {
        this.setStatus(error.message || "Vote failed.", "error");
        this.setButtons(false);
      }
    }

    updateCountdown() {
      const timer = this.mount.querySelector("[data-mdv-timer]");
      if (!timer || !this.week) return;

      if (this.week.status === "closed") {
        timer.textContent = "Voting closed";
        return;
      }

      const closesAt = new Date(this.week.closes_at || this.week.closesAt);
      const remaining = closesAt.getTime() - Date.now();

      if (remaining <= 0) {
        timer.textContent = "Voting closing";
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      timer.textContent = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`;
    }

    setStatus(message, tone = "") {
      const status = this.mount.querySelector("[data-mdv-status]");
      if (!status) return;
      status.textContent = message;
      status.dataset.tone = tone;
    }

    setButtons(disabled) {
      this.mount.querySelectorAll("[data-mdv-vote]").forEach((button) => {
        button.disabled = disabled || this.week?.status === "closed";
      });
    }

    renderError(message) {
      this.mount.innerHTML = `<div class="mdv-root"><div class="mdv-empty">${escapeHTML(message)}</div></div>`;
    }
  }

  async function getJSON(path) {
    const response = await fetch(`${apiBase}${path}`, { headers: { accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }
    return data;
  }

  function injectStyles() {
    if (document.getElementById("mdv-widget-styles")) return;
    const style = document.createElement("style");
    style.id = "mdv-widget-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => entityMap[char]);
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#96;");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
