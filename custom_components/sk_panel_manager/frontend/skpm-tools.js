// "View as…" tab, backup (export / import) and the Kiosk Mode importer of the SK Panel Manager panel.
import { explainKiosk, resolveKioskFor } from "./skpm-resolver.js?v=1.0.3";
import { applyKioskImport, convertKioskMode, makeBackup, readBackup } from "./skpm-import.js?v=1.0.3";
import { KIOSK_GROUPS } from "./skpm-kiosk.js?v=1.0.3";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name) => `<ha-icon icon="${esc(name)}"></ha-icon>`;
const KIOSK_ORDER = Object.values(KIOSK_GROUPS).flat().map(([k]) => k);

export const ToolsMixin = (Base) => class extends Base {
  // ---------------------------------------------------------------- view as
  _view_viewas() {
    const t = this.t;
    const users = this._users.filter((u) => !u.system_generated);
    if (!this._vaUser || !this._user(this._vaUser)) this._vaUser = (users.find((u) => this._eff(u).managed) || users[0])?.id;
    const u = this._user(this._vaUser);
    if (!u) return "";
    const e = this._eff(u);
    const dashboards = this._catalog.filter((p) => p.kind === "dashboard");
    const devices = this._kLayers().filter((l) => l.group === "devices");
    if (this._vaDevice && !devices.find((d) => d.id === this._vaDevice)) this._vaDevice = "";
    const landing = e.default_panel || (e.shown.includes("lovelace") ? "lovelace" : e.shown[0]) || "profile";
    const panel = this._vaPanel && dashboards.find((d) => d.url_path === this._vaPanel) ? this._vaPanel : (dashboards.find((d) => d.url_path === landing)?.url_path || dashboards[0]?.url_path);
    this._vaPanel = panel;
    const device = this._vaDevice || null;

    const pickers = `<div class="card"><div class="body vapick">
        ${this._dropdown({ id: "va-user", change: "va-user", label: t("va_user"), value: u.id,
          options: users.map((x) => ({ value: x.id, label: x.name, avatar: x })) })}
        ${this._dropdown({ id: "va-device", change: "va-device", label: t("va_device"), value: device || "",
          options: [{ value: "", label: t("va_any_device"), icon: "mdi:devices" },
            ...devices.map((d) => ({ value: d.id, label: d.name, icon: "mdi:tablet-cellphone" }))] })}
        ${this._dropdown({ id: "va-panel", change: "va-panel", label: t("va_dashboard"), value: panel,
          options: dashboards.map((d) => ({ value: d.url_path, label: this._ptitle(d.url_path), icon: this._picon(d.url_path) })) })}
      </div></div>`;

    // What happens when the user opens the chosen dashboard.
    // Same rule as the browser module: only panels a rule hides are redirected.
    const hidden = e.managed && e.hidden.includes(panel);
    const redirect = hidden && this._draft.settings.redirect_forbidden;
    const opened = redirect ? landing : panel;
    const kiosk = resolveKioskFor(this._draft, u, device, opened);
    const status = !e.managed
      ? `<div class="banner">${icon("mdi:information-outline")}<span>${esc(t("va_unmanaged", { reason: this._reasonText(e.reason) }))}</span></div>`
      : hidden
        ? `<div class="banner warn">${icon("mdi:arrow-u-right-top")}<span>${esc(redirect ? t("va_redirect", { from: this._ptitle(panel), to: this._ptitle(landing) }) : t("va_hidden_no_redirect", { d: this._ptitle(panel) }))}</span></div>`
        : `<div class="banner ok">${icon("mdi:check-circle-outline")}<span>${esc(t("va_opens", { d: this._ptitle(panel) }))}</span></div>`;

    const summary = `<div class="card"><div class="dhead">${this._avatar(u, "lg")}<div style="flex:1;min-width:0"><h2>${esc(u.name)}</h2>
        <div class="chips" style="margin-top:6px">${e.managed ? this._profileChips(u.id) : `<span class="badge">${esc(this._reasonText(e.reason))}</span>`}</div></div>
        <div class="vastat"><span class="muted small">${esc(t("default_short"))}</span><b>${esc(this._ptitle(landing))}</b></div>
        <div class="vastat"><span class="muted small">${esc(t("panels"))}</span><b>${e.managed ? e.shown.length : this._visibleFor(u).length} / ${this._visibleFor(u).length}</b></div>
        <div class="vastat"><span class="muted small">${esc(t("tab_kiosk"))}</span><b>${Object.keys(kiosk).length || "—"}</b></div>
      </div><div class="body" style="padding-top:0">${status}</div></div>`;

    const devName = device ? devices.find((d) => d.id === device)?.name : t("va_any_device");
    const mock = this._kMock(kiosk, this._ptitle(opened), t("va_mock_caption", { d: devName }));

    // Why: every panel and every kiosk option with the rule that decided it.
    const why = this._visibleFor(u).map((p) => {
      const shown = e.managed ? e.shown.includes(p.url_path) : true;
      const src = e.managed ? this._srcText(e.sources[p.url_path], p.url_path, e) : this._reasonText(e.reason);
      return `<tr><td>${icon(this._picon(p.url_path))} ${esc(this._ptitle(p.url_path))}</td>
        <td><span class="pill2 ${shown ? "ok" : "no"}">${esc(t(shown ? "state_allow" : "state_deny"))}</span></td><td class="muted">${esc(src)}</td></tr>`;
    }).join("");
    const explain = explainKiosk(this._draft, u, device, opened);
    const kioskRows = KIOSK_ORDER.filter((k) => k in explain).map((k) => {
      const x = explain[k];
      return `<tr><td>${esc(t(`ko_${k}`))}</td><td><span class="pill2 ${x.value ? "no" : "ok"}">${esc(t(x.value ? "k_on" : "k_off"))}</span></td>
        <td class="muted">${esc(this._layerText(x.source, opened))}</td></tr>`;
    }).join("");

    return `<div class="grid">${pickers}
      <div class="detail kdetail"><div class="grid">${summary}
        <div class="card"><div class="head">${icon("mdi:help-circle-outline")}<h2>${esc(t("va_why"))}</h2></div><div class="body">
          <h3>${esc(t("panels"))}</h3><table class="why">${why}</table>
          <h3>${esc(t("tab_kiosk"))} · ${esc(this._ptitle(opened))}</h3>
          ${kioskRows ? `<table class="why">${kioskRows}</table>` : `<p class="muted">${esc(t("va_no_kiosk"))}</p>`}
        </div></div></div>
        <div class="grid">${mock}${e.managed ? this._sidebarPreview(u, e) : ""}</div>
      </div></div>`;
  }

  _layerText(src, panel) {
    const t = this.t;
    const where = src.part === "dashboard" ? ` · ${t("va_only_on", { d: this._ptitle(panel) })}` : "";
    if (src.layer === "global") return t("k_general") + where;
    if (src.layer === "user") return t("va_layer_user") + where;
    if (src.layer === "profile") return t("from_profile", { p: this._draft.profiles[src.id]?.name || src.id }) + where;
    const name = this._kLayers().find((l) => l.id === src.id)?.name || src.id;
    return t("va_layer_device", { d: name }) + where;
  }

  // ---------------------------------------------------------------- settings cards
  _toolsCards() {
    const t = this.t;
    const rep = this._importReport;
    const km = this._kmResult;
    const reportBox = rep ? `<div class="banner ${rep.dropped.length ? "warn" : "ok"}">${icon("mdi:file-import-outline")}<span>
        ${esc(t("b_imported", { kept: rep.kept, matched: rep.matched.length }))}
        ${rep.matched.length ? `<br>${esc(t("b_matched", { list: rep.matched.join(", ") }))}` : ""}
        ${rep.dropped.length ? `<br>${esc(t("b_dropped", { list: rep.dropped.join(", ") }))}` : ""}</span></div>` : "";

    let kmBody = `<p class="muted small" style="margin:0 0 12px">${esc(t("km_intro"))}</p>
      <button class="btn" data-action="km-scan" ${this._kmBusy ? "disabled" : ""}>${icon("mdi:magnify-scan")}${esc(t(this._kmBusy ? "km_scanning" : "km_scan"))}</button>`;
    if (km) {
      const changes = [
        ...Object.entries(km.general).map(([url, o]) => [t("k_general"), url, o]),
        ...Object.entries(km.users).flatMap(([uid, d]) => Object.entries(d).map(([url, o]) => [this._user(uid)?.name || uid, url, o])),
      ];
      kmBody += !km.found
        ? `<p class="muted" style="margin:12px 0 0">${esc(t("km_none"))}</p>`
        : `<h3>${esc(t("km_found", { n: km.found }))}</h3>
          ${changes.length ? `<table class="why">${changes.map(([who, url, o]) => `<tr><td><b>${esc(who)}</b></td><td>${esc(this._ptitle(url))}</td>
            <td>${Object.entries(o).map(([k, v]) => `<span class="pill2 ${v ? "no" : "ok"}">${esc(t(`ko_${k}`))}${v ? "" : ` · ${esc(t("k_off"))}`}</span>`).join(" ")}</td></tr>`).join("")}</table>`
            : `<p class="muted">${esc(t("km_nothing_to_add"))}</p>`}
          ${km.skipped.length ? `<h3>${esc(t("km_skipped"))}</h3><ul class="sec small">${km.skipped.map((s) => `<li>${icon("mdi:minus-circle-outline")}<span><code>${esc(s.key)}</code> · ${esc(this._ptitle(s.dashboard))} — ${esc(t(`km_r_${s.reason}`))}</span></li>`).join("")}</ul>` : ""}
          ${km.unmatched.length ? `<div class="banner warn" style="margin-top:12px">${icon("mdi:account-question")}<span>${esc(t("km_unmatched", { list: km.unmatched.join(", ") }))}</span></div>` : ""}
          ${changes.length ? `<div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn primary" data-action="km-apply">${icon("mdi:plus")}${esc(t("km_apply"))}</button></div>` : ""}`;
    }
    return `<div class="card"><div class="head">${icon("mdi:backup-restore")}<h2>${esc(t("b_title"))}</h2></div><div class="body">
        <p class="muted small" style="margin:0 0 12px">${esc(t("b_intro"))}</p>${reportBox}
        <div class="row"><button class="btn" data-action="b-export">${icon("mdi:download")}${esc(t("b_export"))}</button>
          <label class="btn">${icon("mdi:upload")}${esc(t("b_import"))}<input type="file" accept="application/json,.json" data-change="b-import" hidden></label></div>
      </div></div>
      <div class="card"><div class="head">${icon("mdi:swap-horizontal")}<h2>${esc(t("km_title"))}</h2></div><div class="body">${kmBody}</div></div>`;
  }

  // ---------------------------------------------------------------- events
  _toolsClick(a) {
    switch (a) {
      case "b-export": this._exportBackup(); return false;
      case "km-scan": this._scanKioskMode(); return false;
      case "km-apply": {
        applyKioskImport(this._draft, this._kmResult, (uid) => this._ucfg(uid));
        this._kmResult = null;
        this._tab = "kiosk";
        this._showToast(this.t("km_applied"));
        return true;
      }
      default: return false;
    }
  }

  _toolsChange(d, ev) {
    if (d.change === "va-user") this._vaUser = ev.target.value;
    else if (d.change === "va-device") this._vaDevice = ev.target.value;
    else if (d.change === "va-panel") this._vaPanel = ev.target.value;
    else if (d.change === "b-import") { this._importBackup(ev.target.files?.[0]); return false; }
    else return false;
    return true;
  }

  _exportBackup() {
    const data = makeBackup(this._draft, this._users, this._data.version);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sk-panel-manager-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async _importBackup(file) {
    if (!file) return;
    try {
      const { config, report } = readBackup(JSON.parse(await file.text()), this._users);
      this._draft = config;
      this._importReport = report;
      this._render();
      this._showToast(this.t("b_review"));
    } catch (err) {
      this._showToast(this.t(err.message === "not_a_backup" ? "b_bad_file" : "b_bad_json"), true);
    }
  }

  async _scanKioskMode() {
    this._kmBusy = true;
    this._render();
    const found = [];
    try {
      const dashboards = await this._hass.callWS({ type: "lovelace/dashboards/list" });
      const paths = [null, ...dashboards.map((d) => d.url_path)];
      for (const url of paths) {
        try {
          const cfg = await this._hass.callWS({ type: "lovelace/config", url_path: url, force: false });
          if (cfg && cfg.kiosk_mode) found.push({ url_path: url || "lovelace", kiosk_mode: cfg.kiosk_mode });
        } catch (_) { /* auto-generated or empty dashboard */ }
      }
      this._kmResult = convertKioskMode(found, this._users);
    } catch (err) {
      this._showToast(err.message || String(err), true);
    }
    this._kmBusy = false;
    this._render();
  }
};
