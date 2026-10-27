// SK Panel Manager — admin panel.
// Dependency-free web component: renders with template strings, uses event delegation
// and pointer-based drag & drop (mouse + touch), like SK Irrigation Manager.
import { translator } from "./skpm-i18n.js?v=1.0.3";
import { STYLES } from "./skpm-styles.js?v=1.0.3";
import { resolve } from "./skpm-resolver.js?v=1.0.3";
import { KioskMixin } from "./skpm-kiosk.js?v=1.0.3";
import { ToolsMixin } from "./skpm-tools.js?v=1.0.3";

const DOMAIN = "sk_panel_manager";
// Version of this file; compared with the installed integration to spot a stale browser cache.
export const PANEL_VERSION = "1.0.3";
const TABS = [
  ["overview", "mdi:view-dashboard-outline"],
  ["matrix", "mdi:table-check"],
  ["users", "mdi:account-multiple-outline"],
  ["profiles", "mdi:account-group-outline"],
  ["kiosk", "mdi:monitor-lock"],
  ["viewas", "mdi:account-eye-outline"],
  ["settings", "mdi:cog-outline"],
];
const KINDS = ["dashboard", "builtin", "integration", "addon"];
const PALETTE = ["#3f51cd", "#1e88e5", "#00a6a6", "#2e9e6b", "#7cb342", "#f2a900", "#ef6c00", "#e5533d", "#d81b60", "#8e44ad"];

// Only "#rrggbb" may reach a style attribute (values can come from an imported file).
const cssColor = (c) => (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clone = (o) => JSON.parse(JSON.stringify(o));
const newId = (p) => `${p}_${Math.random().toString(16).slice(2, 10)}`;
const initials = (name) => ((name || "").match(/\p{L}+/gu) || ["?"]).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const colorFor = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const icon = (name) => `<ha-icon icon="${esc(name)}"></ha-icon>`;
// Shown before searching (and the whole list if Home Assistant's icon index can't be loaded).
const SUGGESTED_ICONS = ["account-group", "account-child", "human-child", "human-male-female-child", "baby-face",
  "account-clock", "account-tie", "account-hard-hat", "account-wrench", "account-lock", "shield-account", "crown",
  "home", "home-heart", "home-account", "bed", "sofa", "chef-hat", "tablet", "tablet-dashboard", "monitor-dashboard",
  "television", "cellphone", "gamepad-variant", "music", "school", "briefcase", "tools", "wrench", "broom",
  "sprinkler-variant", "flower", "leaf", "dog", "cat", "car", "garage", "cctv", "lock", "key", "lightbulb",
  "flash", "solar-power", "security", "star", "heart", "eye", "eye-off"];
const ICON_LIMIT = 120;

class SkPanelManagerPanel extends ToolsMixin(KioskMixin(HTMLElement)) {
  constructor() {
    super();
    this._tab = "overview";
    this._search = "";
    this._selUser = null;
    this._selProfile = null;
  }

  // ------------------------------------------------------------------ HA hooks
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._menu) this._menu.hass = hass;
    if (first) {
      this.t = translator(hass.language || hass.locale?.language);
      this._setup();
      this._load();
    }
  }

  set narrow(narrow) {
    this._narrow = narrow;
    if (this._menu) {
      this._menu.narrow = narrow;
      this._menu.style.display = narrow ? "" : "none";
    }
  }

  set panel(panel) {
    this._panel = panel;
  }

  _setup() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLES}</style>
      <div class="toolbar"><span class="menu"></span><div class="title">${icon("mdi:view-dashboard-edit")}<span>${esc(this.t("title"))}</span></div><span class="pill" id="pill"></span></div>
      <div class="tabs" role="tablist">${TABS.map(([k, i]) => `<button class="tab" role="tab" data-tab="${k}">${icon(i)}${esc(this.t(`tab_${k}`))}</button>`).join("")}</div>
      <div class="scroller"><main id="main"></main></div><div id="overlay"></div>`;
    this._menu = document.createElement("ha-menu-button");
    this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;
    this._menu.style.display = this._narrow ? "" : "none";
    root.querySelector(".menu").appendChild(this._menu);
    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("change", (e) => this._onChange(e));
    root.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    root.addEventListener("keydown", (e) => this._onKeyDown(e));
  }

  async _load() {
    try {
      this._apply(await this._hass.callWS({ type: `${DOMAIN}/config` }));
      this._error = null;
    } catch (err) {
      this._error = err.message || String(err);
    }
    this._render();
  }

  _apply(data) {
    this._data = data;
    this._draft = clone(data.config);
    this._catalog = data.catalog;
    this._panels = new Map(data.catalog.map((p) => [p.url_path, p]));
    this._users = data.users;
  }

  get _dirty() {
    return !!this._data && JSON.stringify(this._comparable(this._draft)) !== JSON.stringify(this._comparable(this._data.config));
  }

  // A user entry with nothing set is the same as no entry (the server drops neither, but both behave alike).
  _comparable(config) {
    const users = {};
    for (const [id, u] of Object.entries(config.users)) {
      const empty = !u.profiles.length && !Object.keys(u.panels).length && u.panel_order == null
        && u.default_panel == null && u.kiosk == null && u.managed !== false;
      if (!empty) users[id] = u;
    }
    const sortKeys = (o) => (o && typeof o === "object" && !Array.isArray(o)
      ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : o);
    return sortKeys({ ...config, users });
  }

  // ------------------------------------------------------------------ helpers
  _ptitle(id) {
    const p = this._panels.get(id);
    const loc = (k) => (this._hass.localize ? this._hass.localize(k) : "") || "";
    if (id === "lovelace") return loc("panel.states") || "Overview";
    if (!p) return id;
    return loc(`panel.${p.title}`) || p.title || id;
  }

  _picon(id) {
    const p = this._panels.get(id);
    if (!p) return "mdi:help-circle-outline";
    return p.icon || (p.kind === "dashboard" ? "mdi:view-dashboard" : "mdi:application-outline");
  }

  _eff(user) {
    const e = resolve(this._draft, user, this._catalog);
    // Panels Home Assistant hides by default (Lights, Climate...) only show with an explicit rule.
    e.shown = e.allowed.filter((id) => !(this._panels.get(id)?.default_visible === false && e.sources[id] === "default"));
    // The main dashboard has no title: Home Assistant only lists it while it's the user's default.
    if (e.default_panel && e.default_panel !== "lovelace") e.shown = e.shown.filter((id) => this._panels.get(id)?.title != null);
    return e;
  }

  _visibleFor(user) {
    return this._catalog.filter((p) => !(p.require_admin && !user.is_admin));
  }

  _user(id) {
    return this._users.find((u) => u.id === id);
  }

  _ucfg(uid) {
    if (!this._draft.users[uid]) {
      this._draft.users[uid] = { profiles: [], panels: {}, panel_order: null, default_panel: null, kiosk: null, managed: true };
    }
    return this._draft.users[uid];
  }

  _srcText(src, panel, e) {
    if (panel && e && e.allowed.includes(panel) && !e.shown.includes(panel)) {
      return this.t(this._panels.get(panel)?.title == null ? "from_ha_main" : "from_ha_default");
    }
    if (src === "user") return this.t("from_user");
    if (src === "default") return this.t("from_default");
    const pid = src.split(":")[1];
    return this.t("from_profile", { p: this._draft.profiles[pid]?.name || pid });
  }

  _reasonText(reason) {
    return this.t(`reason_${reason}`);
  }

  _avatar(user, size = "") {
    return `<span class="avatar ${size}" style="--c:${colorFor(user.id)}">${esc(initials(user.name))}</span>`;
  }

  _profileChips(uid) {
    const pids = this._draft.users[uid]?.profiles || [];
    if (!pids.length) return `<span class="muted small">${esc(this.t("no_profile"))}</span>`;
    return pids.map((pid) => {
      const p = this._draft.profiles[pid];
      return p ? `<span class="chip" style="background:${cssColor(p.color) || colorFor(pid)};color:#fff">${icon(p.icon)}${esc(p.name)}</span>` : "";
    }).join("");
  }

  // ------------------------------------------------------------------ render
  _render() {
    const root = this.shadowRoot;
    if (!root) return;
    const focus = root.activeElement;
    const focusKey = focus?.dataset?.focus;
    const caret = focus && "selectionStart" in focus ? focus.selectionStart : null;
    const scroller = root.querySelector(".scroller");
    const top = scroller.scrollTop;
    // Inner scroll areas (the matrix) are rebuilt too: keep where they were.
    const kept = {};
    root.querySelectorAll("[data-keep]").forEach((el) => { kept[el.dataset.keep] = [el.scrollLeft, el.scrollTop]; });

    root.querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === this._tab);
      b.setAttribute("aria-selected", b.dataset.tab === this._tab);
    });
    const main = root.getElementById("main");
    if (this._error) {
      main.innerHTML = `<div class="banner err">${icon("mdi:alert-circle")}<b>${esc(this.t("load_error"))}:</b> ${esc(this._error)}</div>`;
      return;
    }
    if (!this._data) {
      main.innerHTML = "";
      return;
    }
    const managed = this._users.filter((u) => this._eff(u).managed).length;
    root.getElementById("pill").innerHTML = `${icon("mdi:shield-account")}${esc(this.t("managed_pill", { n: managed }))}`;

    const stale = this._panel?.config?.version && this._panel.config.version !== PANEL_VERSION;
    const banner = stale
      ? `<div class="banner warn">${icon("mdi:update")}<span class="spacer">${esc(this.t("reload_needed"))}</span><button class="btn" data-action="reload">${esc(this.t("reload"))}</button></div>`
      : "";
    main.innerHTML = banner + this[`_view_${this._tab}`]();
    this._renderOverlay();

    scroller.scrollTop = top;
    root.querySelectorAll("[data-keep]").forEach((el) => {
      const pos = kept[el.dataset.keep];
      if (pos) [el.scrollLeft, el.scrollTop] = pos;
    });
    this._flash = null;
    if (this._refocusCell) {
      root.querySelector(this._refocusCell)?.focus({ preventScroll: true });
      this._refocusCell = null;
    } else if (this._refocus) {
      root.querySelector(`.sort .si[data-id="${CSS.escape(this._refocus)}"]`)?.focus({ preventScroll: true });
      this._refocus = null;
    } else if (focusKey) {
      const el = root.querySelector(`[data-focus="${focusKey}"]`);
      if (el) {
        el.focus();
        if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret);
      }
    }
  }

  _renderOverlay() {
    const o = this.shadowRoot.getElementById("overlay");
    if (this._toast) {
      o.innerHTML = `<div class="toast ${this._toast.err ? "err" : ""}">${icon(this._toast.err ? "mdi:alert" : "mdi:check-circle")}${esc(this._toast.text)}</div>`;
      return;
    }
    o.innerHTML = this._dirty
      ? `<div class="savebar"><span class="dot"></span><span>${esc(this.t("unsaved"))}</span>
          <button class="btn ghost" data-action="discard">${esc(this.t("discard"))}</button>
          <button class="btn primary" data-action="save" ${this._saving ? "disabled" : ""}>${icon("mdi:content-save")}${esc(this.t(this._saving ? "saving" : "save"))}</button></div>`
      : "";
  }

  _showToast(text, err = false) {
    this._toast = { text, err };
    this._renderOverlay();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toast = null;
      this._renderOverlay();
    }, 2600);
  }

  // ------------------------------------------------------------------ overview
  _view_overview() {
    const t = this.t;
    const users = this._users;
    const effs = new Map(users.map((u) => [u.id, this._eff(u)]));
    const managed = users.filter((u) => effs.get(u.id).managed);
    const profiles = Object.entries(this._draft.profiles);
    const members = Object.values(this._draft.users).filter((u) => u.profiles.some((p) => this._draft.profiles[p])).length;
    const hidden = managed.reduce((n, u) => {
      const e = effs.get(u.id);
      return n + this._visibleFor(u).filter((p) => !e.shown.includes(p.url_path)).length;
    }, 0);
    const dashboards = this._catalog.filter((p) => p.kind === "dashboard").length;
    const kpi = (ic, color, val, lbl, sub) => `<div class="card kpi"><span class="icon-box" style="--c:${color}">${icon(ic)}</span>
      <div><div class="val">${val}</div><div class="lbl">${esc(lbl)}</div><div class="muted small">${esc(sub)}</div></div></div>`;

    const alerts = [];
    for (const u of managed) {
      const e = effs.get(u.id);
      if (!e.shown.length) alerts.push(["bad", "mdi:eye-off", t("alert_nothing", { name: u.name })]);
      const cfg = this._draft.users[u.id];
      const wanted = cfg?.default_panel || (cfg?.profiles || []).map((p) => this._draft.profiles[p]?.default_panel).find(Boolean);
      if (wanted && e.default_panel && wanted !== e.default_panel) {
        alerts.push(["", "mdi:home-alert", t("alert_nodefault", { name: u.name, panel: this._ptitle(e.default_panel) })]);
      }
    }
    const ghosts = new Set();
    for (const item of [...Object.values(this._draft.profiles), ...Object.values(this._draft.users)]) {
      for (const p of Object.keys(item.panels)) if (!this._panels.has(p)) ghosts.add(p);
    }
    if (ghosts.size) alerts.push(["", "mdi:ghost-outline", t("alert_ghost", { list: [...ghosts].join(", ") })]);

    const cards = users.map((u) => {
      const e = effs.get(u.id);
      const total = this._visibleFor(u).length;
      const shown = e.managed ? e.shown.length : total;
      const sub = e.managed
        ? `<div class="chips">${this._profileChips(u.id)}</div>`
        : `<span class="badge">${esc(this._reasonText(e.reason))}</span>`;
      return `<button class="card ucard ${e.managed ? "" : "off"}" data-action="go-user" data-uid="${esc(u.id)}">
        <div class="row">${this._avatar(u)}<div style="min-width:0;flex:1"><div class="name">${esc(u.name)}</div>${sub}</div></div>
        <div class="meter" style="${e.managed ? "" : "background:var(--pm-line)"}"><i style="width:${total ? (shown / total) * 100 : 0}%;${e.managed ? "" : "background:var(--pm-muted)"}"></i></div>
        <div class="row small muted"><span>${esc(t("sees", { a: shown, t: total }))}</span><span class="spacer"></span>
          ${e.default_panel ? `<span>${icon("mdi:home-import-outline")} ${esc(this._ptitle(e.default_panel))}</span>` : ""}</div>
      </button>`;
    }).join("");

    return `<div class="kpis">
        ${kpi("mdi:account-check", "#3f51cd", managed.length, t("kpi_users"), t("kpi_users_sub", { n: users.length }))}
        ${kpi("mdi:account-group", "#00a6a6", profiles.length, t("kpi_profiles"), t("kpi_profiles_sub", { n: members }))}
        ${kpi("mdi:view-grid", "#2e9e6b", this._catalog.length, t("kpi_panels"), t("kpi_panels_sub", { d: dashboards }))}
        ${kpi("mdi:eye-off", "#e5533d", hidden, t("kpi_hidden"), t("kpi_hidden_sub"))}
      </div>
      <div class="ov">
        <div class="ucards">${cards}</div>
        <div class="card"><div class="head">${icon("mdi:bell-outline")}<h2>${esc(t("alerts"))}</h2></div><div class="body">
          ${alerts.length ? alerts.map(([cls, ic, txt]) => `<div class="alert ${cls}">${icon(ic)}<span>${esc(txt)}</span></div>`).join("")
            : `<div class="alert">${icon("mdi:check-circle-outline")}<span>${esc(t("no_alerts"))}</span></div>`}
        </div></div>
      </div>`;
  }

  // ------------------------------------------------------------------ matrix
  _sortedCatalog() {
    return KINDS.flatMap((k) => this._catalog.filter((p) => p.kind === k));
  }

  _view_matrix() {
    const t = this.t;
    const cols = this._sortedCatalog();
    const kinds = KINDS.map((k) => [k, cols.filter((p) => p.kind === k).length]).filter(([, n]) => n);
    const dot = (cls, ic) => `<span class="dot ${cls}">${ic ? icon(ic) : ""}</span>`;
    const stateIcon = (v) => (v === "allow" ? "mdi:eye" : v === "deny" ? "mdi:eye-off" : "");
    const span = cols.length;

    const profileRows = Object.entries(this._draft.profiles).map(([pid, p]) => {
      const members = Object.values(this._draft.users).filter((u) => u.profiles.includes(pid)).length;
      const cells = cols.map((c) => {
        const v = p.panels[c.url_path];
        const title = t("cell_title", { panel: this._ptitle(c.url_path), who: p.name, state: t(`state_${v || "none"}`), src: t("profiles") });
        const flash = this._flash === `p:${pid}:${c.url_path}` ? "flash" : "";
        return `<td><button class="cell ${flash}" data-action="cycle-profile" data-pid="${esc(pid)}" data-panel="${esc(c.url_path)}" title="${esc(title)}" aria-label="${esc(title)}">${dot(v || "none", stateIcon(v))}</button></td>`;
      }).join("");
      return `<tr><th><div class="who"><span class="icon-box" style="--c:${cssColor(p.color) || colorFor(pid)};width:30px;height:30px">${icon(p.icon)}</span>
        <div style="min-width:0"><div class="n">${esc(p.name)}</div><div class="s">${esc(t("member_count", { n: members }))}</div></div></div></th>${cells}</tr>`;
    }).join("");

    const userRows = this._users.map((u) => {
      const e = this._eff(u);
      const cfg = this._draft.users[u.id];
      const sub = e.managed
        ? ((cfg?.profiles || []).map((p) => this._draft.profiles[p]?.name).filter(Boolean).join(", ") || t("no_profile"))
        : this._reasonText(e.reason);
      const cells = cols.map((c) => {
        if (!e.managed) return `<td><span class="cell off">${dot("none")}</span></td>`;
        if (c.require_admin && !u.is_admin) return `<td><span class="cell na" title="${esc(t("legend_na"))}">${dot("none", "mdi:lock")}</span></td>`;
        const own = cfg?.panels?.[c.url_path];
        const access = e.shown.includes(c.url_path) ? "allow" : "deny";
        const src = this._srcText(e.sources[c.url_path], c.url_path, e);
        const title = t("cell_title", { panel: this._ptitle(c.url_path), who: u.name, state: t(`state_${access}`), src });
        const flash = this._flash === `u:${u.id}:${c.url_path}` ? "flash" : "";
        return `<td><button class="cell ${flash}" data-action="cycle-user" data-uid="${esc(u.id)}" data-panel="${esc(c.url_path)}" title="${esc(title)}" aria-label="${esc(title)}">${dot(`${access} ${own ? "" : "inh"}`, stateIcon(access))}</button></td>`;
      }).join("");
      return `<tr><th><div class="who">${this._avatar(u, "sm")}<div style="min-width:0"><div class="n">${esc(u.name)}</div><div class="s">${esc(sub)}</div></div></div></th>${cells}</tr>`;
    }).join("");

    return `<div class="legend">
        <span class="cell">${dot("allow", "mdi:eye")}${esc(t("legend_allow"))}</span>
        <span class="cell">${dot("deny", "mdi:eye-off")}${esc(t("legend_deny"))}</span>
        <span class="cell">${dot("allow inh", "mdi:eye")}${esc(t("legend_inherit"))}</span>
        <span class="cell">${dot("none", "mdi:lock")}${esc(t("legend_na"))}</span>
        <span class="spacer"></span><span>${esc(t("matrix_hint"))}</span>
      </div>
      <div class="card mwrap" data-keep="matrix"><table class="matrix">
        <thead>
          <tr class="kinds"><th class="corner"></th>${kinds.map(([k, n]) => `<th colspan="${n}">${esc(t(`kind_${k}`))}</th>`).join("")}</tr>
          <tr class="cols"><th class="corner"></th>${cols.map((c) => `<th><div class="colhead" title="${esc(c.url_path)}">${icon(this._picon(c.url_path))}<span>${esc(this._ptitle(c.url_path))}</span>${c.default_visible ? "" : `<em>${esc(t("ha_hidden_short"))}</em>`}</div></th>`).join("")}</tr>
        </thead>
        <tbody>
          ${profileRows ? `<tr class="section"><th>${esc(t("profiles"))}</th><td colspan="${span}"></td></tr>${profileRows}` : ""}
          <tr class="section"><th>${esc(t("users"))}</th><td colspan="${span}"></td></tr>${userRows}
        </tbody>
      </table></div>`;
  }

  // ------------------------------------------------------------------ users
  _view_users() {
    const t = this.t;
    const q = this._search.toLowerCase();
    const users = this._users.filter((u) => u.name.toLowerCase().includes(q));
    if (!this._selUser || !this._user(this._selUser)) {
      this._selUser = (this._users.find((u) => this._eff(u).managed) || this._users[0])?.id;
    }
    const list = users.map((u) => {
      const e = this._eff(u);
      const sub = e.managed ? t("sees", { a: e.shown.length, t: this._visibleFor(u).length }) : this._reasonText(e.reason);
      return `<button class="item ${u.id === this._selUser ? "sel" : ""}" data-action="sel-user" data-uid="${esc(u.id)}">${this._avatar(u, "sm")}
        <span class="t"><b>${esc(u.name)}</b><span class="muted small">${esc(sub)}</span></span></button>`;
    }).join("");
    const user = this._user(this._selUser);
    return `<div class="md">
      <div class="card list"><div class="search"><input type="search" data-focus="search" data-input="search" placeholder="${esc(t("search_users"))}" value="${esc(this._search)}"></div>${list}</div>
      <div>${user ? this._userDetail(user) : ""}</div>
    </div>`;
  }

  _userDetail(u) {
    const t = this.t;
    const e = this._eff(u);
    const cfg = this._draft.users[u.id];
    const lockedReason = u.is_owner ? "owner" : u.system_generated ? "system" : null;
    const adminFree = u.is_admin && !u.is_owner && !this._draft.settings.restrict_admins;
    const isOn = !lockedReason && !adminFree && cfg?.managed !== false;
    const roles = [u.is_owner ? "Owner" : null, u.is_admin ? "Admin" : null].filter(Boolean).map((r) => `<span class="badge">${r}</span>`).join(" ");

    const head = `<div class="card"><div class="dhead">${this._avatar(u, "lg")}
      <div style="flex:1;min-width:0"><h2>${esc(u.name)}</h2><div class="row small" style="margin-top:4px">${roles}</div></div>
      ${lockedReason || adminFree ? "" : `<div class="row" style="gap:10px"><span class="small muted" style="text-align:right;max-width:240px">${esc(t("managed_toggle"))}</span>
        <button class="switch ${isOn ? "on" : ""}" data-action="toggle-managed" data-uid="${esc(u.id)}" role="switch" aria-checked="${isOn}" aria-label="${esc(t("managed_toggle"))}"></button></div>`}
    </div></div>`;

    if (!e.managed) {
      const note = e.reason === "owner" ? t("owner_note") : e.reason === "admin" ? t("admin_note") : t("managed_toggle_sub");
      return `<div class="grid">${head}<div class="banner">${icon("mdi:information-outline")}<span>${esc(note)}</span></div></div>`;
    }

    const profiles = Object.entries(this._draft.profiles);
    const profileCard = `<div class="card"><div class="head">${icon("mdi:account-group")}<h2>${esc(t("user_profiles"))}</h2></div><div class="body">
      ${profiles.length ? `<div class="chips">${profiles.map(([pid, p]) => `<button class="chip toggle ${cfg?.profiles.includes(pid) ? "on" : ""}" style="--c:${cssColor(p.color) || colorFor(pid)}"
          data-action="toggle-user-profile" data-uid="${esc(u.id)}" data-pid="${esc(pid)}">${icon(p.icon)}${esc(p.name)}</button>`).join("")}</div>
          <p class="muted small" style="margin:10px 0 0">${esc(t("user_profiles_sub"))}</p>`
        : `<div class="row"><span class="muted">${esc(t("no_profiles_yet"))}</span><span class="spacer"></span><button class="btn" data-action="new-profile">${icon("mdi:plus")}${esc(t("create_profile"))}</button></div>`}
    </div></div>`;

    const rows = this._visibleFor(u).map((p) => {
      const own = cfg?.panels?.[p.url_path];
      const access = e.shown.includes(p.url_path) ? "allow" : "deny";
      const val = own || "inherit";
      const seg = ["inherit", "allow", "deny"].map((v) => `<button class="${v} ${val === v ? "on" : ""}" data-action="set-user-panel" data-uid="${esc(u.id)}" data-panel="${esc(p.url_path)}" data-value="${v}"
          aria-pressed="${val === v}">${v === "inherit" ? "" : icon(v === "allow" ? "mdi:eye" : "mdi:eye-off")}${esc(t(v === "inherit" ? "inherit" : v === "allow" ? "show" : "hide"))}</button>`).join("");
      return `<div class="prow ${access === "deny" ? "dim" : ""}"><span class="pi">${icon(this._picon(p.url_path))}</span>
        <span class="pt"><b>${esc(this._ptitle(p.url_path))}</b><span class="muted small">${esc(t(`state_${access}`))} · ${esc(this._srcText(e.sources[p.url_path], p.url_path, e))}</span></span>
        <span class="seg">${seg}</span></div>`;
    }).join("");
    const panelsCard = `<div class="card"><div class="head">${icon("mdi:view-grid-outline")}<h2>${esc(t("panels"))}</h2>
        <button class="btn ghost small" data-action="user-all" data-uid="${esc(u.id)}" data-value="allow">${esc(t("all_show"))}</button>
        <button class="btn ghost small" data-action="user-all" data-uid="${esc(u.id)}" data-value="deny">${esc(t("all_hide"))}</button>
        <button class="btn ghost small" data-action="user-all" data-uid="${esc(u.id)}" data-value="inherit">${esc(t("all_inherit"))}</button>
      </div><div class="body" style="padding-top:6px;padding-bottom:6px">${rows}</div></div>`;

    const ownDefault = cfg?.default_panel || null;
    const ownOrder = cfg?.panel_order != null;
    const orderCard = `<div class="card"><div class="head">${icon("mdi:sort")}<h2>${esc(t("order"))}</h2>
        <span class="badge">${esc(ownOrder ? t("order_own") : e.order ? t("order_inherited") : t("order_user"))}</span></div>
      <div class="body grid">
        ${this._defaultLine(ownDefault, ownDefault ? null : e.default_panel)}
        <div><div class="row" style="margin-bottom:8px"><span class="muted small">${esc(t("order_hint"))}</span><span class="spacer"></span>
          ${ownOrder ? `<button class="btn ghost small" data-action="user-order-reset" data-uid="${esc(u.id)}">${icon("mdi:restore")}${esc(t("order_reset"))}</button>` : ""}</div>
          ${this._sortable(`user:${u.id}`, this._orderedAllowed(e), { own: ownDefault, inherited: ownDefault ? null : e.default_panel })}</div>
      </div></div>`;

    return `<div class="grid">${head}<div class="detail"><div class="grid">${profileCard}${panelsCard}${orderCard}</div>${this._sidebarPreview(u, e)}</div></div>`;
  }

  _orderedAllowed(e) {
    const order = (e.order || []).filter((p) => e.shown.includes(p));
    return [...order, ...e.shown.filter((p) => !order.includes(p))];
  }

  // Which dashboard the user / profile starts on, above the list (the list's house buttons change it).
  _defaultLine(own, inherited) {
    const t = this.t;
    const text = own ? t("default_set", { d: this._ptitle(own) })
      : inherited ? t("default_inherited", { d: this._ptitle(inherited) }) : t("default_none");
    return `<div class="defline ${own ? "own" : ""}">${icon(own ? "mdi:home" : "mdi:home-outline")}<span>${esc(text)}</span></div>`;
  }

  // defaults: { own, inherited } — draws the house button that picks the default dashboard.
  _sortable(key, ids, defaults = null) {
    const t = this.t;
    const dropped = this._dropped;
    this._dropped = null;
    const house = (id) => {
      if (!defaults) return "";
      const own = defaults.own === id;
      const inh = !defaults.own && defaults.inherited === id;
      const label = own ? t("default_unset") : t("default_pick", { d: this._ptitle(id) });
      return `<button class="home ${own ? "on" : ""} ${inh ? "inh" : ""}" data-action="set-default" data-key="${esc(key)}" data-id="${esc(id)}"
        title="${esc(label)}" aria-label="${esc(label)}" aria-pressed="${own}">${icon(own || inh ? "mdi:home" : "mdi:home-outline")}</button>`;
    };
    return `<div class="sort" data-sort="${esc(key)}" role="list">${ids.map((id, i) => `<div class="si ${dropped === id ? "dropped" : ""} ${defaults && defaults.own === id ? "def" : ""}" data-id="${esc(id)}"
      role="listitem" tabindex="0" aria-label="${esc(`${i + 1}. ${this._ptitle(id)}`)}">
      <span class="grip" aria-hidden="true">${icon("mdi:drag-vertical")}</span><span class="pos">${i + 1}</span>
      <span class="pic">${icon(this._picon(id))}</span><span class="pname">${esc(this._ptitle(id))}</span>${house(id)}
      <span class="keys"><button class="btn ghost mini" data-action="move" data-dir="-1" tabindex="-1" aria-label="Up" ${i === 0 ? "disabled" : ""}>${icon("mdi:chevron-up")}</button>
      <button class="btn ghost mini" data-action="move" data-dir="1" tabindex="-1" aria-label="Down" ${i === ids.length - 1 ? "disabled" : ""}>${icon("mdi:chevron-down")}</button></span></div>`).join("")}</div>`;
  }

  // Store a new order for a sortable list and re-render with the moved item highlighted.
  _commitOrder(list, order, movedId) {
    const [kind, id] = list.dataset.sort.split(/:(.*)/s);
    if (kind === "user") this._ucfg(id).panel_order = order;
    else this._draft.profiles[id].panel_order = order;
    this._dropped = movedId;
    this._refocus = movedId;
    this._render();
  }

  _moveBy(item, dir) {
    const list = item.parentElement;
    const order = [...list.children].map((c) => c.dataset.id);
    const from = order.indexOf(item.dataset.id);
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    order.splice(to, 0, order.splice(from, 1)[0]);
    this._commitOrder(list, order, item.dataset.id);
  }

  _sidebarPreview(u, e) {
    const t = this.t;
    const items = this._orderedAllowed(e);
    const def = e.default_panel || (items.includes("lovelace") ? "lovelace" : items[0]);
    const hidden = this._visibleFor(u).map((p) => p.url_path).filter((p) => !e.shown.includes(p));
    return `<div class="card sb"><div class="muted small" style="padding:10px 16px 0;text-transform:uppercase;letter-spacing:.5px;font-weight:600">${esc(t("preview"))}</div>
      <div class="sbh">${icon("mdi:home-assistant")}<b>Home Assistant</b></div>
      ${items.length ? items.map((p) => `<div class="sbi ${p === def ? "def" : ""}">${icon(this._picon(p))}<span>${esc(this._ptitle(p))}</span>${p === def ? `<span class="tag">${esc(t("preview_default"))}</span>` : ""}</div>`).join("")
        : `<div class="sbi muted">${esc(t("preview_none"))}</div>`}
      ${hidden.length ? `<div class="sbsep">${esc(t("preview_hidden"))}</div>${hidden.map((p) => `<div class="sbi hid">${icon(this._picon(p))}<span>${esc(this._ptitle(p))}</span></div>`).join("")}` : ""}
      <div style="height:10px"></div></div>`;
  }

  // ------------------------------------------------------------------ profiles
  _view_profiles() {
    const t = this.t;
    const entries = Object.entries(this._draft.profiles);
    if (!entries.length) {
      return `<div class="card empty">${icon("mdi:account-group-outline")}<p>${esc(t("profile_empty"))}</p>
        <button class="btn primary" data-action="new-profile">${icon("mdi:plus")}${esc(t("new_profile"))}</button></div>`;
    }
    if (!this._selProfile || !this._draft.profiles[this._selProfile]) this._selProfile = entries[0][0];
    const list = entries.map(([pid, p]) => {
      const members = Object.values(this._draft.users).filter((u) => u.profiles.includes(pid)).length;
      return `<button class="item ${pid === this._selProfile ? "sel" : ""}" data-action="sel-profile" data-pid="${esc(pid)}">
        <span class="icon-box" style="--c:${cssColor(p.color) || colorFor(pid)};width:30px;height:30px">${icon(p.icon)}</span>
        <span class="t"><b>${esc(p.name)}</b><span class="muted small">${esc(t("member_count", { n: members }))} · ${esc(t("rules_count", { n: Object.keys(p.panels).length }))}</span></span></button>`;
    }).join("");
    return `<div class="md">
      <div class="card list">${list}<button class="btn ghost" style="margin-top:6px" data-action="new-profile">${icon("mdi:plus")}${esc(t("new_profile"))}</button></div>
      <div>${this._profileDetail(this._selProfile)}</div></div>`;
  }

  _profileDetail(pid) {
    const t = this.t;
    const p = this._draft.profiles[pid];
    const color = cssColor(p.color) || colorFor(pid);
    const candidates = this._users.filter((u) => !u.is_owner && !u.system_generated);
    const members = candidates.map((u) => {
      const on = this._draft.users[u.id]?.profiles.includes(pid);
      return `<button class="chip toggle ${on ? "on" : ""}" style="--c:${color}" data-action="toggle-user-profile" data-uid="${esc(u.id)}" data-pid="${esc(pid)}">
        ${esc(u.name)}${u.is_admin ? " · admin" : ""}</button>`;
    }).join("");
    const rows = this._catalog.map((c) => {
      const val = p.panels[c.url_path] || "none";
      const seg = ["none", "allow", "deny"].map((v) => `<button class="${v === "none" ? "inherit" : v} ${val === v ? "on" : ""}" data-action="set-profile-panel" data-pid="${esc(pid)}"
          data-panel="${esc(c.url_path)}" data-value="${v}" aria-pressed="${val === v}">${v === "none" ? "" : icon(v === "allow" ? "mdi:eye" : "mdi:eye-off")}${esc(t(v === "none" ? "no_rule" : v === "allow" ? "show" : "hide"))}</button>`).join("");
      return `<div class="prow"><span class="pi">${icon(this._picon(c.url_path))}</span><span class="pt"><b>${esc(this._ptitle(c.url_path))}</b>
        <span class="muted small">${esc(t(`kind_${c.kind}`))}${c.require_admin ? " · admin" : ""}</span></span><span class="seg">${seg}</span></div>`;
    }).join("");
    const allowed = this._catalog
      .filter((c) => p.panels[c.url_path] === "allow" || (c.default_visible && p.panels[c.url_path] !== "deny"))
      .map((c) => c.url_path);
    const order = [...(p.panel_order || []).filter((id) => allowed.includes(id)), ...allowed.filter((id) => !(p.panel_order || []).includes(id))];

    return `<div class="grid">
      <div class="card"><div class="dhead"><span class="icon-box" style="--c:${color};width:56px;height:56px;border-radius:16px">${icon(p.icon)}</span>
        <div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2></div>
        <button class="btn danger" data-action="delete-profile" data-pid="${esc(pid)}">${icon("mdi:delete-outline")}${esc(t("delete_profile"))}</button></div>
        <div class="body form2" style="border-top:1px solid var(--pm-line)">
          <label class="field">${esc(t("profile_name"))}<input type="text" maxlength="60" data-focus="pname" data-input="profile-name" data-pid="${esc(pid)}" value="${esc(p.name)}"></label>
          <div class="field iconfield"><span>${esc(t("profile_icon"))}</span>
            <button class="iconbtn" data-action="icon-open" data-pid="${esc(pid)}" aria-haspopup="dialog" aria-expanded="${this._iconPicker === pid}">
              ${icon(p.icon)}<span>${esc(p.icon.replace("mdi:", ""))}</span>${icon("mdi:chevron-down")}</button>
            ${this._iconPicker === pid ? this._iconPop(pid, p.icon) : ""}</div>
          <div class="field" style="grid-column:1/-1"><span class="small muted">${esc(t("profile_color"))}</span>
            <div class="palette">${PALETTE.map((c) => `<button style="--c:${c}" class="${c === color ? "on" : ""}" data-action="profile-color" data-pid="${esc(pid)}" data-color="${c}" aria-label="${c}"></button>`).join("")}</div></div>
        </div></div>
      <div class="card"><div class="head">${icon("mdi:account-multiple")}<h2>${esc(t("members"))}</h2></div><div class="body"><div class="chips">${members}</div></div></div>
      <div class="detail kdetail"><div class="card"><div class="head">${icon("mdi:view-grid-outline")}<h2>${esc(t("panels"))}</h2></div>
        <div class="body" style="padding-top:6px;padding-bottom:6px">${rows}</div></div>
        <div class="card"><div class="head">${icon("mdi:sort")}<h2>${esc(t("order"))}</h2></div><div class="body grid">
          ${this._defaultLine(p.default_panel, null)}
          <div><div class="row" style="margin-bottom:8px"><span class="muted small">${esc(t("order_hint"))}</span><span class="spacer"></span>
            ${p.panel_order ? `<button class="btn ghost small" data-action="profile-order-reset" data-pid="${esc(pid)}">${icon("mdi:restore")}</button>` : ""}</div>
          ${this._sortable(`profile:${pid}`, order, { own: p.default_panel, inherited: null })}</div></div></div></div>
    </div>`;
  }

  // ------------------------------------------------------------------ settings
  _view_settings() {
    const t = this.t;
    const s = this._draft.settings;
    const opt = (v, ic, title, sub) => `<label class="opt ${s.default_access === v ? "on" : ""}"><input type="radio" name="access" value="${v}" data-change="setting-access" ${s.default_access === v ? "checked" : ""}>
      <span>${icon(ic)}</span><span><b>${esc(title)}</b><div class="muted small">${esc(sub)}</div></span></label>`;
    const sw = (key, title, sub, next) => `<div class="setting"><div class="txt"><b>${esc(title)}</b><span class="muted small">${esc(sub)}</span>
      ${next ? `<div style="margin-top:6px"><span class="badge warn">${esc(t("s_next"))}</span></div>` : ""}</div>
      <button class="switch ${s[key] ? "on" : ""}" data-action="toggle-setting" data-key="${key}" role="switch" aria-checked="${!!s[key]}" aria-label="${esc(title)}"></button></div>`;
    return `<div class="grid" style="max-width:860px">
      <div class="card"><div class="head">${icon("mdi:filter-variant")}<h2>${esc(t("s_access"))}</h2></div><div class="body access">
        ${opt("allow", "mdi:eye-check-outline", t("s_allow"), t("s_allow_sub"))}${opt("deny", "mdi:eye-lock-outline", t("s_deny"), t("s_deny_sub"))}</div></div>
      <div class="card"><div class="body" style="padding-top:2px;padding-bottom:2px">
        ${sw("restrict_admins", t("s_admins"), t("s_admins_sub"))}
        ${sw("lock_sidebar_editing", t("s_lock"), t("s_lock_sub"))}
        ${sw("redirect_forbidden", t("s_redirect"), t("s_redirect_sub"))}</div></div>
      <div class="card"><div class="head">${icon("mdi:shield-alert-outline")}<h2>${esc(t("s_security"))}</h2></div><div class="body"><ul class="sec">
        <li>${icon("mdi:check-circle")}<span>${esc(t("s_sec_1"))}</span></li>
        <li>${icon("mdi:check-circle")}<span>${esc(t("s_sec_2"))}</span></li>
        <li>${icon("mdi:alert-circle-outline")}<span>${esc(t("s_sec_3"))}</span></li></ul></div></div>
      ${this._toolsCards()}
      <div class="muted small">SK Panel Manager · ${esc(t("version"))} ${esc(this._data.version)}</div>
    </div>`;
  }

  // ------------------------------------------------------------------ dropdown
  // Styled replacement for <select>. `change` and `data` go through the same _onChange as a select did.
  // options: [{ value, label, icon?, avatar? }]; `button` overrides the closed look (e.g. an "add" chip).
  _dropdown({ id, change, data = {}, value = "", options, label = "", button = null, cls = "" }) {
    const open = this._dd === id;
    const current = options.find((o) => o.value === value);
    const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
    const lead = (o) => (o.avatar ? this._avatar(o.avatar, "xs") : o.icon ? icon(o.icon) : "");
    const shown = button || `${current ? lead(current) : ""}<span>${esc(current ? current.label : "")}</span>${icon("mdi:chevron-down")}`;
    return `<div class="dd ${cls} ${open ? "open" : ""}" data-dd="${esc(id)}" data-change="${esc(change)}"${attrs}>
      ${label ? `<span class="ddlabel">${esc(label)}</span>` : ""}
      <button class="ddbtn" data-action="dd-toggle" data-dd="${esc(id)}" aria-haspopup="listbox" aria-expanded="${open}">${shown}</button>
      ${open ? `<div class="ddpop" role="listbox">${options.map((o) => `<button class="ddopt ${o.value === value ? "sel" : ""}" role="option"
        aria-selected="${o.value === value}" data-action="dd-pick" data-dd="${esc(id)}" data-value="${esc(o.value)}">${lead(o)}<span>${esc(o.label)}</span>
        ${o.value === value ? icon("mdi:check") : ""}</button>`).join("")}</div>` : ""}
    </div>`;
  }

  _ddPick(el) {
    const box = el.closest(".dd");
    this._dd = null;
    // Same path as a native select's "change" event.
    this._onChange({ target: { dataset: box.dataset, value: el.dataset.value, files: null } });
  }

  // ------------------------------------------------------------------ icon picker
  _iconPop(pid, current) {
    const t = this.t;
    const q = (this._iconQuery || "").trim().toLowerCase();
    let names;
    let caption;
    if (!q) {
      names = SUGGESTED_ICONS;
      caption = t("icon_suggested");
    } else {
      const list = this._icons || SUGGESTED_ICONS.map((name) => ({ name, keywords: [] }));
      const terms = q.replace(/^mdi:/, "").split(/\s+/);
      const hits = list.filter((i) => terms.every((term) => i.name.includes(term) || (i.keywords || []).some((k) => k.includes(term))));
      // Best matches first: exact name, name starting with the search, name containing it, then keywords.
      const rank = (n) => (n === terms[0] ? 0 : n.startsWith(terms[0]) ? 1 : n.includes(terms[0]) ? 2 : 3);
      hits.sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length);
      names = hits.slice(0, ICON_LIMIT).map((i) => i.name);
      caption = hits.length > ICON_LIMIT ? t("icon_more", { n: ICON_LIMIT, t: hits.length }) : t("icon_results", { n: hits.length });
    }
    const cur = current.replace("mdi:", "");
    return `<div class="iconpop" role="dialog" aria-label="${esc(t("profile_icon"))}">
      <input type="search" data-focus="iconsearch" data-input="icon-search" value="${esc(this._iconQuery || "")}" placeholder="${esc(t("icon_search"))}">
      <div class="muted small">${esc(this._icons === undefined && q ? t("icon_loading") : caption)}</div>
      <div class="icongrid">${names.map((n) => `<button class="${n === cur ? "on" : ""}" data-action="pick-icon" data-pid="${esc(pid)}"
        data-icon="mdi:${esc(n)}" title="${esc(n)}" aria-label="${esc(n)}">${icon(`mdi:${n}`)}</button>`).join("") || `<span class="muted small">${esc(t("icon_none"))}</span>`}</div>
    </div>`;
  }

  // Home Assistant serves its icon index (names + keywords) for its own icon picker.
  async _loadIcons() {
    if (this._icons !== undefined) return;
    this._icons = null;
    try {
      const res = await fetch("/static/mdi/iconList.json");
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      this._icons = Array.isArray(list) ? list.filter((i) => i && typeof i.name === "string") : [];
    } catch (_) {
      this._icons = SUGGESTED_ICONS.map((name) => ({ name, keywords: [] }));
    }
    if (this._iconPicker) this._render();
  }

  // ------------------------------------------------------------------ events
  _onClick(ev) {
    if (this._iconPicker && !ev.target.closest(".iconfield")) {
      this._iconPicker = null;
      this._render();
    }
    if (this._dd && !ev.target.closest(".dd")) {
      this._dd = null;
      this._render();
    }
    const tab = ev.target.closest("[data-tab]");
    if (tab) {
      this._tab = tab.dataset.tab;
      this._render();
      return;
    }
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const d = el.dataset;
    const a = d.action;
    const cycle = { undefined: "allow", allow: "deny", deny: undefined };
    switch (a) {
      case "move": this._moveBy(el.closest(".si"), Number(d.dir)); return;
      case "reload": location.reload(); return;
      case "save": this._save(); return;
      case "discard": this._draft = clone(this._data.config); break;
      case "go-user": this._selUser = d.uid; this._tab = "users"; break;
      case "sel-user": this._selUser = d.uid; break;
      case "sel-profile": this._selProfile = d.pid; break;
      case "cycle-profile": {
        this._flash = `p:${d.pid}:${d.panel}`;
        this._refocusCell = `[data-action="cycle-profile"][data-pid="${CSS.escape(d.pid)}"][data-panel="${CSS.escape(d.panel)}"]`;
        const panels = this._draft.profiles[d.pid].panels;
        const next = cycle[panels[d.panel]];
        if (next) panels[d.panel] = next; else delete panels[d.panel];
        break;
      }
      case "cycle-user": {
        this._flash = `u:${d.uid}:${d.panel}`;
        this._refocusCell = `[data-action="cycle-user"][data-uid="${CSS.escape(d.uid)}"][data-panel="${CSS.escape(d.panel)}"]`;
        const panels = this._ucfg(d.uid).panels;
        const next = cycle[panels[d.panel]];
        if (next) panels[d.panel] = next; else delete panels[d.panel];
        break;
      }
      case "set-user-panel": {
        const panels = this._ucfg(d.uid).panels;
        if (d.value === "inherit") delete panels[d.panel]; else panels[d.panel] = d.value;
        break;
      }
      case "set-profile-panel": {
        const panels = this._draft.profiles[d.pid].panels;
        if (d.value === "none") delete panels[d.panel]; else panels[d.panel] = d.value;
        break;
      }
      case "user-all": {
        const u = this._user(d.uid);
        const cfg = this._ucfg(d.uid);
        if (d.value === "inherit") cfg.panels = {};
        else this._visibleFor(u).forEach((p) => { cfg.panels[p.url_path] = d.value; });
        break;
      }
      case "toggle-managed": {
        const cfg = this._ucfg(d.uid);
        cfg.managed = cfg.managed === false;
        break;
      }
      case "toggle-user-profile": {
        const cfg = this._ucfg(d.uid);
        cfg.profiles = cfg.profiles.includes(d.pid) ? cfg.profiles.filter((p) => p !== d.pid) : [...cfg.profiles, d.pid];
        break;
      }
      case "user-order-reset": this._ucfg(d.uid).panel_order = null; break;
      case "profile-order-reset": this._draft.profiles[d.pid].panel_order = null; break;
      case "new-profile": {
        const pid = newId("profile");
        const n = Object.keys(this._draft.profiles).length;
        this._draft.profiles[pid] = { name: `${this.t("new_profile")} ${n + 1}`, icon: "mdi:account-group", color: PALETTE[n % PALETTE.length],
          panels: {}, panel_order: null, default_panel: null, kiosk: null };
        this._selProfile = pid;
        this._tab = "profiles";
        break;
      }
      case "delete-profile": {
        const p = this._draft.profiles[d.pid];
        if (!confirm(this.t("delete_confirm", { name: p.name }))) return;
        delete this._draft.profiles[d.pid];
        Object.values(this._draft.users).forEach((u) => { u.profiles = u.profiles.filter((x) => x !== d.pid); });
        this._selProfile = null;
        break;
      }
      case "dd-toggle": {
        this._dd = this._dd === d.dd ? null : d.dd;
        this._render();
        // Keyboard users land on the selected option.
        if (this._dd) (this.shadowRoot.querySelector(".dd.open .ddopt.sel") || this.shadowRoot.querySelector(".dd.open .ddopt"))?.focus();
        return;
      }
      case "dd-pick": this._ddPick(el); return;
      case "profile-color": this._draft.profiles[d.pid].color = d.color; break;
      case "set-default": {
        // Tap the house of a dashboard to start there; tap it again to go back to inherited / unchanged.
        const [kind, id] = d.key.split(/:(.*)/s);
        const target = kind === "user" ? this._ucfg(id) : this._draft.profiles[id];
        target.default_panel = target.default_panel === d.id ? null : d.id;
        break;
      }
      case "icon-open": {
        this._iconPicker = this._iconPicker === d.pid ? null : d.pid;
        this._iconQuery = "";
        this._loadIcons();
        this._render();
        this.shadowRoot.querySelector('[data-focus="iconsearch"]')?.focus();
        return;
      }
      case "pick-icon":
        this._draft.profiles[d.pid].icon = d.icon;
        this._iconPicker = null;
        break;
      case "toggle-setting": this._draft.settings[d.key] = !this._draft.settings[d.key]; break;
      default:
        if (!this._kioskClick(a, d) && !this._toolsClick(a, d)) return;
    }
    this._render();
  }

  _onInput(ev) {
    const d = ev.target.dataset;
    if (d.input === "search") this._search = ev.target.value;
    else if (d.input === "profile-name") this._draft.profiles[d.pid].name = ev.target.value;
    else if (d.input === "icon-search") this._iconQuery = ev.target.value;
    else if (!this._kioskInput(d, ev.target.value)) return;
    this._render();
  }

  _onChange(ev) {
    const d = ev.target.dataset;
    const v = ev.target.value || null;
    if (d.change === "user-default") this._ucfg(d.uid).default_panel = v;
    else if (d.change === "profile-default") this._draft.profiles[d.pid].default_panel = v;
    else if (d.change === "setting-access") this._draft.settings.default_access = ev.target.value;
    else if (!this._kioskChange(d, ev.target.value) && !this._toolsChange(d, ev)) return;
    this._render();
  }

  // Pointer-based drag & drop for the order lists (mouse and touch). The dragged row follows the
  // pointer, the others slide out of the way, and on release the row glides into its slot.
  _onPointerDown(ev) {
    const item = ev.target.closest(".sort .si");
    if (!item || ev.button > 0 || ev.target.closest("button") || this._drag) return;
    const list = item.parentElement;
    const items = [...list.children];
    if (items.length < 2) return;
    ev.preventDefault();
    const from = items.indexOf(item);
    const rects = items.map((el) => el.getBoundingClientRect());
    const step = rects[1].top - rects[0].top;
    const scroller = this.shadowRoot.querySelector(".scroller");
    const startScroll = scroller.scrollTop;
    const startY = ev.clientY;
    const drag = (this._drag = { to: from, dy: 0, y: ev.clientY, raf: 0 });
    list.classList.add("sorting");
    item.classList.add("dragging");
    try { item.setPointerCapture(ev.pointerId); } catch (_) { /* synthetic events */ }

    const layout = () => {
      const offset = drag.dy + (scroller.scrollTop - startScroll);
      // Keep the row inside the list.
      const min = rects[0].top - rects[from].top;
      const max = rects[rects.length - 1].top - rects[from].top;
      const clamped = Math.max(min - step / 2, Math.min(max + step / 2, offset));
      item.style.transform = `translateY(${clamped}px) scale(1.03)`;
      const center = rects[from].top + rects[from].height / 2 + clamped;
      let to = 0;
      rects.forEach((r, i) => { if (i !== from && r.top + r.height / 2 < center) to++; });
      drag.to = to;
      items.forEach((el, i) => {
        if (el === item) {
          el.querySelector(".pos").textContent = to + 1;
          return;
        }
        const shift = from < to && i > from && i <= to ? -step : from > to && i >= to && i < from ? step : 0;
        el.style.transform = shift ? `translateY(${shift}px)` : "";
        el.querySelector(".pos").textContent = i + 1 + Math.sign(shift);
      });
    };
    // Scroll the page while dragging near the top or bottom edge.
    const autoscroll = () => {
      const box = scroller.getBoundingClientRect();
      const edge = 60;
      const speed = drag.y < box.top + edge ? -(box.top + edge - drag.y) / 4 : drag.y > box.bottom - edge ? (drag.y - box.bottom + edge) / 4 : 0;
      if (speed) {
        scroller.scrollTop += speed;
        layout();
      }
      drag.raf = requestAnimationFrame(autoscroll);
    };
    drag.raf = requestAnimationFrame(autoscroll);

    const move = (e) => {
      drag.dy = e.clientY - startY;
      drag.y = e.clientY;
      layout();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      cancelAnimationFrame(drag.raf);
      const to = drag.to;
      item.classList.add("dropping");
      item.style.transform = `translateY(${(to - from) * step}px)`;
      setTimeout(() => {
        this._drag = null;
        list.classList.remove("sorting");
        if (to === from) {
          items.forEach((el) => { el.style.transform = ""; el.classList.remove("dragging", "dropping"); });
          return;
        }
        const order = items.map((el) => el.dataset.id);
        order.splice(to, 0, order.splice(from, 1)[0]);
        this._commitOrder(list, order, item.dataset.id);
      }, 190);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _onKeyDown(ev) {
    if (this._dd && ev.target.closest?.(".dd")) {
      const opts = [...this.shadowRoot.querySelectorAll(".dd.open .ddopt")];
      const i = opts.indexOf(ev.target);
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        const next = i < 0 ? 0 : Math.min(opts.length - 1, Math.max(0, i + (ev.key === "ArrowDown" ? 1 : -1)));
        opts[next]?.focus();
        return;
      }
      if (ev.key === "Escape") {
        const id = this._dd;
        this._dd = null;
        this._render();
        this.shadowRoot.querySelector(`.dd[data-dd="${CSS.escape(id)}"] .ddbtn`)?.focus();
        return;
      }
    }
    if (ev.key === "Escape" && this._iconPicker) {
      this._iconPicker = null;
      this._render();
      return;
    }
    const item = ev.target.closest?.(".sort .si");
    if (!item || ev.target !== item) return;
    if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
      ev.preventDefault();
      this._moveBy(item, ev.key === "ArrowUp" ? -1 : 1);
    }
  }

  async _save() {
    this._saving = true;
    this._renderOverlay();
    try {
      this._apply(await this._hass.callWS({ type: `${DOMAIN}/config/save`, config: this._draft }));
      this._saving = false;
      this._render();
      this._showToast(this.t("saved"));
    } catch (err) {
      this._saving = false;
      this._render();
      this._showToast(err.message || String(err), true);
    }
  }
}

if (!customElements.get("sk-panel-manager-panel")) {
  customElements.define("sk-panel-manager-panel", SkPanelManagerPanel);
}
