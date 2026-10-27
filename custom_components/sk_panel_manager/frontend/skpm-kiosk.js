// Kiosk tab of the SK Panel Manager panel: layers (general, profiles, users, devices), per-dashboard
// overrides, option groups and a mock of Home Assistant showing what gets hidden.
import { resolveKioskFor, unmanagedReason } from "./skpm-resolver.js?v=1.0.2";

export const KIOSK_GROUPS = {
  screen: [["kiosk", "mdi:monitor-lock"], ["hide_header", "mdi:page-layout-header"], ["hide_sidebar", "mdi:page-layout-sidebar-left"], ["hide_menubutton", "mdi:menu"]],
  header: [["hide_search", "mdi:magnify"], ["hide_assistant", "mdi:comment-processing-outline"], ["hide_edit_dashboard", "mdi:pencil"], ["hide_overflow", "mdi:dots-vertical"]],
  sidebar: [["hide_settings", "mdi:cog"], ["hide_notifications", "mdi:bell"], ["hide_account", "mdi:account-circle"]],
  dialogs: [["block_more_info", "mdi:card-off-outline"], ["hide_dialog_settings", "mdi:cog-outline"], ["hide_dialog_overflow", "mdi:dots-vertical"]],
  interaction: [["block_context_menu", "mdi:gesture-tap-hold"], ["block_mouse", "mdi:cursor-default-click-outline"]],
};

// Only "#rrggbb" may reach a style attribute (values can come from an imported file).
const cssColor = (c) => (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name) => `<ha-icon icon="${esc(name)}"></ha-icon>`;

function thisDevice() {
  try { return localStorage.getItem("skpm_device_id"); } catch (_) { return null; }
}

export const KioskMixin = (Base) => class extends Base {
  // ---------------------------------------------------------------- layer helpers
  _kLayers() {
    const t = this.t;
    const cfg = this._draft;
    const status = this._data.device_status || {};
    const deviceIds = [...new Set([...Object.keys(cfg.devices || {}), ...Object.keys(status)])];
    return [
      { key: "global", name: t("k_general"), icon: "mdi:earth", color: "#3f51cd", group: "general" },
      ...Object.entries(cfg.profiles).map(([pid, p]) => ({ key: `profile:${pid}`, name: p.name, icon: p.icon, color: p.color, group: "profiles" })),
      ...this._users.filter((u) => !u.system_generated).map((u) => ({ key: `user:${u.id}`, name: u.name, user: u, group: "users" })),
      ...deviceIds.map((id) => ({ key: `device:${id}`, name: cfg.devices?.[id]?.name || this._deviceLabel(status[id]), icon: "mdi:tablet-cellphone", color: "#00a6a6", group: "devices", id })),
    ];
  }

  _deviceLabel(st) {
    const ua = st?.user_agent || "";
    const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
    const app = /Home Assistant\//.test(ua) ? "App" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : this.t("k_browser");
    return [app, os].filter(Boolean).join(" · ") || this.t("k_unnamed");
  }

  // Returns the kiosk object of a layer, creating it when asked.
  _kGet(key, create = false) {
    const cfg = this._draft;
    const [kind, id] = key.split(/:(.*)/s);
    let holder;
    if (kind === "global") holder = cfg;
    else if (kind === "profile") holder = cfg.profiles[id];
    else if (kind === "user") holder = create ? this._ucfg(id) : cfg.users[id];
    else {
      cfg.devices = cfg.devices || {};
      if (!cfg.devices[id] && create) cfg.devices[id] = { name: this._deviceLabel(this._data.device_status?.[id]), kiosk: null };
      holder = cfg.devices[id];
    }
    if (!holder) return null;
    if (!holder.kiosk && create) holder.kiosk = { all: {}, dashboards: {} };
    return holder.kiosk;
  }

  _kTidy(key) {
    // An empty layer goes back to null so "no changes" compares equal.
    const k = this._kGet(key);
    if (!k) return;
    for (const [p, o] of Object.entries(k.dashboards)) if (!Object.keys(o).length) delete k.dashboards[p];
    if (!Object.keys(k.all).length && !Object.keys(k.dashboards).length) {
      const [kind, id] = key.split(/:(.*)/s);
      const holder = kind === "global" ? this._draft : kind === "profile" ? this._draft.profiles[id] : kind === "user" ? this._draft.users[id] : this._draft.devices[id];
      holder.kiosk = null;
    }
  }

  _kCount(k) {
    if (!k) return 0;
    return Object.keys(k.all || {}).length + Object.values(k.dashboards || {}).reduce((n, o) => n + Object.keys(o).length, 0);
  }

  _dashboards() {
    return this._catalog.filter((p) => p.kind === "dashboard");
  }

  // ---------------------------------------------------------------- view
  _view_kiosk() {
    const t = this.t;
    const layers = this._kLayers();
    if (!this._kSel || !layers.find((l) => l.key === this._kSel)) this._kSel = "global";
    const groups = ["general", "profiles", "users", "devices"];
    const list = groups.map((g) => {
      const items = layers.filter((l) => l.group === g);
      if (!items.length && g !== "devices") return "";
      return `<div class="lgroup">${esc(t(`k_group_${g}`))}</div>` + (items.length ? items.map((l) => {
        const n = this._kCount(this._kGet(l.key));
        const av = l.user ? this._avatar(l.user, "sm") : `<span class="icon-box" style="--c:${cssColor(l.color) || "#5c6bc0"};width:30px;height:30px">${icon(l.icon)}</span>`;
        const mine = l.id && l.id === thisDevice() ? `<span class="badge">${esc(t("k_this_device"))}</span>` : "";
        const off = l.user && unmanagedReason(this._draft, l.user) ? "dim" : "";
        return `<button class="item ${l.key === this._kSel ? "sel" : ""} ${off}" data-action="k-sel" data-key="${esc(l.key)}">${av}
          <span class="t"><b>${esc(l.name)}</b><span class="muted small">${n ? esc(t("k_count", { n })) : esc(t("k_none"))}</span></span>${mine}</button>`;
      }).join("") : `<div class="muted small" style="padding:6px 10px">${esc(t("k_no_devices"))}</div>`);
    }).join("");
    const layer = layers.find((l) => l.key === this._kSel);
    return `<div class="md"><div class="card list">${list}</div><div>${this._kDetail(layer)}</div></div>`;
  }

  _kDetail(layer) {
    const t = this.t;
    const k = this._kGet(layer.key) || { all: {}, dashboards: {} };
    const scope = this._kScope && (this._kScope === "all" || k.dashboards[this._kScope] || this._kAdding === this._kScope) ? this._kScope : "all";
    this._kScope = scope;
    const opts = scope === "all" ? k.all : (k.dashboards[scope] || {});
    const kind = layer.key.split(":")[0];

    let note = t(`k_applies_${kind}`);
    if (kind === "user" && unmanagedReason(this._draft, layer.user)) note = t("k_user_unmanaged");
    const st = layer.id ? this._data.device_status?.[layer.id] : null;
    const deviceInfo = kind === "device" ? `<div class="body form2" style="border-top:1px solid var(--pm-line)">
        <label class="field">${esc(t("k_device_name"))}<input type="text" maxlength="60" data-focus="dname" data-input="k-device-name" data-id="${esc(layer.id)}" value="${esc(this._draft.devices?.[layer.id]?.name || layer.name)}"></label>
        <div class="field"><span>${esc(t("k_last_seen"))}</span><span style="color:var(--pm-text)">${st ? esc(`${this._user(st.last_user)?.name || "?"} · ${this._ago(st.last_seen)}`) : "—"}</span></div>
      </div>` : "";

    const head = `<div class="card"><div class="dhead">
        ${layer.user ? this._avatar(layer.user, "lg") : `<span class="icon-box" style="--c:${cssColor(layer.color) || "#5c6bc0"};width:56px;height:56px;border-radius:16px">${icon(layer.icon)}</span>`}
        <div style="flex:1;min-width:0"><h2>${esc(layer.name)}</h2><div class="muted small" style="margin-top:4px">${esc(note)}</div></div>
        ${kind === "device" ? `<button class="btn danger" data-action="k-forget" data-id="${esc(layer.id)}">${icon("mdi:delete-outline")}${esc(t("k_forget"))}</button>` : ""}
      </div>${deviceInfo}</div>`;

    const dashOverrides = Object.keys(k.dashboards);
    if (this._kAdding && !dashOverrides.includes(this._kAdding)) dashOverrides.push(this._kAdding);
    const free = this._dashboards().filter((d) => !dashOverrides.includes(d.url_path));
    const scopes = `<div class="scopes">
        <button class="chip toggle ${scope === "all" ? "on" : ""}" data-action="k-scope" data-scope="all">${icon("mdi:view-dashboard-variant")}${esc(t("k_all_dashboards"))}</button>
        ${dashOverrides.map((p) => `<span class="chip toggle ${scope === p ? "on" : ""}" data-action="k-scope" data-scope="${esc(p)}">${icon(this._picon(p))}${esc(this._ptitle(p))}
          <button class="x" data-action="k-del-scope" data-scope="${esc(p)}" aria-label="${esc(t("k_remove"))}">${icon("mdi:close")}</button></span>`).join("")}
        ${free.length ? `<select class="addscope" data-change="k-add-scope"><option value="">＋ ${esc(t("k_add_dashboard"))}</option>${free.map((d) => `<option value="${esc(d.url_path)}">${esc(this._ptitle(d.url_path))}</option>`).join("")}</select>` : ""}
      </div>
      <p class="muted small" style="margin:8px 0 0">${esc(scope === "all" ? t("k_scope_all_hint") : t("k_scope_dash_hint", { d: this._ptitle(scope) }))}</p>`;

    const groups = Object.entries(KIOSK_GROUPS).map(([g, items]) => `<div class="card"><div class="head">${icon(this._kGroupIcon(g))}<h2>${esc(t(`k_g_${g}`))}</h2></div>
      <div class="body" style="padding-top:4px;padding-bottom:4px">${items.map(([key, ic]) => {
        const v = key in opts ? (opts[key] ? "on" : "off") : "inherit";
        const seg = ["inherit", "on", "off"].map((x) => `<button class="${x === "on" ? "allow" : x === "off" ? "deny" : "inherit"} ${v === x ? "on" : ""}"
            data-action="k-set" data-key="${esc(layer.key)}" data-opt="${key}" data-value="${x}" aria-pressed="${v === x}">${esc(t(`k_${x}`))}</button>`).join("");
        const warn = key === "hide_account" ? `<span class="badge warn">${esc(t("k_warn_account"))}</span>` : "";
        return `<div class="prow ${v === "on" ? "" : ""}"><span class="pi">${icon(ic)}</span><span class="pt"><b>${esc(t(`ko_${key}`))}</b>
          <span class="muted small">${esc(t(`ko_${key}_sub`))}</span>${warn}</span><span class="seg">${seg}</span></div>`;
      }).join("")}</div></div>`).join("");

    return `<div class="grid">${head}
      <div class="card"><div class="body">${scopes}</div></div>
      <div class="detail kdetail"><div class="grid">${groups}</div>${this._kPreview(layer, scope)}</div></div>`;
  }

  _kGroupIcon(g) {
    return { screen: "mdi:monitor", header: "mdi:page-layout-header", sidebar: "mdi:page-layout-sidebar-left", dialogs: "mdi:card-text-outline", interaction: "mdi:gesture-tap" }[g];
  }

  _ago(iso) {
    if (!iso) return "—";
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 90) return this.t("k_now");
    if (s < 3600) return this.t("k_min", { n: Math.round(s / 60) });
    if (s < 86400) return this.t("k_hours", { n: Math.round(s / 3600) });
    return this.t("k_days", { n: Math.round(s / 86400) });
  }

  // What this layer produces: for users and devices the real combination of every layer,
  // for general and profiles the layer on its own.
  _kResult(layer, scope) {
    const panel = scope === "all" ? null : scope;
    const [kind, id] = layer.key.split(/:(.*)/s);
    if (kind === "user") return resolveKioskFor(this._draft, layer.user, null, panel);
    if (kind === "device") {
      const last = this._user(this._data.device_status?.[id]?.last_user);
      const user = last || { id: "_nobody", name: "", is_admin: true, is_owner: true, system_generated: false };
      return resolveKioskFor(this._draft, user, id, panel);
    }
    const k = this._kGet(layer.key) || { all: {}, dashboards: {} };
    const out = { ...k.all, ...(panel ? k.dashboards[panel] || {} : {}) };
    return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
  }

  _kPreview(layer, scope) {
    const t = this.t;
    const o = this._kResult(layer, scope);
    const dash = scope === "all" ? t("k_mock_dashboard") : this._ptitle(scope);
    const kind = layer.key.split(":")[0];
    const caption = kind === "user" || kind === "device" ? t("k_preview_combined") : t("k_preview_layer");
    return this._kMock(o, dash, caption);
  }

  // Mock of Home Assistant with the given kiosk options (hidden parts outlined in red).
  _kMock(o, dash, caption) {
    const t = this.t;
    const full = !!o.kiosk;
    const off = (cond) => (cond ? "off" : "");
    const hideHeader = full || o.hide_header;
    const hideSidebar = full || o.hide_sidebar;
    return `<div class="card sb"><div class="muted small" style="padding:10px 16px 0;text-transform:uppercase;letter-spacing:.5px;font-weight:600">${esc(t("k_preview"))}</div>
      <div class="muted small" style="padding:2px 16px 10px">${esc(caption)}</div>
      <div class="mock ${o.block_mouse ? "nomouse" : ""}">
        <div class="m-side ${off(hideSidebar)}">
          <div class="m-row m-top"><span class="m-ic ${off(full || o.hide_menubutton)}">${icon("mdi:menu")}</span><span class="m-line w60"></span></div>
          ${[70, 55, 62, 48].map((w, i) => `<div class="m-row ${i === 0 ? "act" : ""}"><span class="m-dot"></span><span class="m-line" style="width:${w}%"></span></div>`).join("")}
          <div class="m-spacer"></div>
          <div class="m-row ${off(o.hide_settings)}">${icon("mdi:cog")}<span class="m-line w50"></span></div>
          <div class="m-row ${off(o.hide_notifications)}">${icon("mdi:bell")}<span class="m-line w50"></span></div>
          <div class="m-row ${off(o.hide_account)}">${icon("mdi:account-circle")}<span class="m-line w40"></span></div>
        </div>
        <div class="m-main">
          <div class="m-head ${off(hideHeader)}">
            <span class="m-ic ${off(full || o.hide_menubutton || !hideSidebar)}">${icon("mdi:menu")}</span>
            <b>${esc(dash)}</b><span class="spacer"></span>
            <span class="m-ic ${off(full || o.hide_search)}">${icon("mdi:magnify")}</span>
            <span class="m-ic ${off(full || o.hide_assistant)}">${icon("mdi:comment-processing-outline")}</span>
            <span class="m-ic ${off(full || o.hide_edit_dashboard)}">${icon("mdi:pencil")}</span>
            <span class="m-ic ${off(full || o.hide_overflow)}">${icon("mdi:dots-vertical")}</span>
          </div>
          <div class="m-cards">${[1, 2, 3, 4].map(() => `<span class="m-card"></span>`).join("")}</div>
          <div class="m-dialog ${o.block_more_info ? "blocked" : ""}">
            <div class="m-dhead">${icon("mdi:close")}<span class="m-line w40"></span><span class="spacer"></span>
              <span class="m-ic ${off(o.hide_dialog_settings)}">${icon("mdi:cog-outline")}</span>
              <span class="m-ic ${off(o.hide_dialog_overflow)}">${icon("mdi:dots-vertical")}</span></div>
            <div class="m-dbody"><span class="m-toggle"></span></div>
            ${o.block_more_info ? `<div class="m-block">${icon("mdi:cancel")}</div>` : ""}
          </div>
        </div>
        ${o.block_mouse ? `<div class="m-nomouse">${icon("mdi:hand-back-left-off-outline")}<span>${esc(t("ko_block_mouse"))}</span></div>` : ""}
      </div>
      <div class="m-legend"><span><i class="sw"></i>${esc(t("k_legend_shown"))}</span><span><i class="sw off"></i>${esc(t("k_legend_hidden"))}</span></div>
      ${o.block_context_menu ? `<div class="m-note">${icon("mdi:gesture-tap-hold")}${esc(t("ko_block_context_menu"))}</div>` : ""}
    </div>`;
  }

  // ---------------------------------------------------------------- events
  _kioskClick(a, d) {
    switch (a) {
      case "k-sel": this._kSel = d.key; this._kScope = "all"; this._kAdding = null; return true;
      case "k-scope": this._kScope = d.scope; return true;
      case "k-del-scope": {
        const k = this._kGet(this._kSel);
        if (k) delete k.dashboards[d.scope];
        if (this._kAdding === d.scope) this._kAdding = null;
        this._kScope = "all";
        this._kTidy(this._kSel);
        return true;
      }
      case "k-set": {
        const k = this._kGet(d.key, true);
        const target = this._kScope === "all" ? k.all : (k.dashboards[this._kScope] = k.dashboards[this._kScope] || {});
        if (d.value === "inherit") delete target[d.opt];
        else target[d.opt] = d.value === "on";
        if (this._kScope !== "all" && Object.keys(target).length) this._kAdding = null;
        this._kTidy(d.key);
        return true;
      }
      case "k-forget": {
        if (!confirm(this.t("k_forget_confirm"))) return false;
        this._forgetDevice(d.id);
        return false;
      }
      default: return false;
    }
  }

  _kioskInput(d, value) {
    if (d.input !== "k-device-name") return false;
    this._draft.devices = this._draft.devices || {};
    const dev = this._draft.devices[d.id] || (this._draft.devices[d.id] = { name: "", kiosk: null });
    dev.name = value;
    return true;
  }

  _kioskChange(d, value) {
    if (d.change !== "k-add-scope" || !value) return false;
    this._kAdding = value;
    this._kScope = value;
    return true;
  }

  async _forgetDevice(id) {
    try {
      const data = await this._hass.callWS({ type: "sk_panel_manager/device/forget", device_id: id });
      const draft = this._draft;
      if (draft.devices) delete draft.devices[id];
      this._apply(data);
      this._draft = draft;
      this._kSel = "global";
      this._render();
    } catch (err) {
      this._showToast(err.message || String(err), true);
    }
  }
};
