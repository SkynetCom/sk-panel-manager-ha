// SK Panel Manager — temporary admin panel (phase 1). The full UI arrives in phase 2.
class SkPanelManagerPanel extends HTMLElement {
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._load();
  }

  set panel(panel) {
    this._panel = panel;
  }

  async _load() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    try {
      this._data = await this._hass.callWS({ type: "sk_panel_manager/config" });
      this._error = null;
    } catch (err) {
      this._error = err.message || String(err);
    }
    this._render();
  }

  _render() {
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const d = this._data;
    const rows = d
      ? d.users.map((u) => {
          const e = d.effective[u.id];
          const state = e.managed ? `${e.allowed.length} visible · ${e.hidden.length} hidden` : `not managed (${e.reason})`;
          return `<tr><td>${esc(u.name)}</td><td>${esc(state)}</td><td>${esc(e.default_panel || "")}</td></tr>`;
        }).join("")
      : "";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; padding: 24px; font-family: var(--paper-font-body1_-_font-family, sans-serif);
                color: var(--primary-text-color); background: var(--primary-background-color); min-height: 100vh; box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; max-width: 760px; }
        td, th { text-align: left; padding: 8px; border-bottom: 1px solid var(--divider-color); }
        .err { color: var(--error-color); }
      </style>
      <h1>SK Panel Manager <small>${esc(d?.version || "")}</small></h1>
      <p>The full admin interface is coming in the next version. Current state per user:</p>
      ${this._error ? `<p class="err">${esc(this._error)}</p>` : ""}
      <table><tr><th>User</th><th>Panels</th><th>Default</th></tr>${rows}</table>`;
  }
}

if (!customElements.get("sk-panel-manager-panel")) {
  customElements.define("sk-panel-manager-panel", SkPanelManagerPanel);
}
