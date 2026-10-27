// SK Panel Manager — browser module, loaded on every Home Assistant page.
//
// It only acts for users the integration manages, and only uses stable frontend events,
// not Home Assistant's page structure:
// - "show-dialog" with dialogTag "dialog-edit-sidebar" is blocked when sidebar editing is locked
//   (this covers the profile's "Edit" button and the sidebar long-press);
// - "location-changed" / "popstate": a hidden panel opened by its address goes to the user's
//   default dashboard.
// - kiosk options: Home Assistant's own kiosk mode where it covers the option, otherwise a small
//   stylesheet in the right shadow root. Every selector lives in SELECTORS below, so a frontend
//   change is fixed in one place.
// The rules come from sk_panel_manager/subscribe, which only returns the calling user's own rules.
(() => {
  if (window.__skPanelManagerRuntime) return;
  window.__skPanelManagerRuntime = true;

  const DOMAIN = "sk_panel_manager";
  // Never redirected away from: the profile (where the user signs out) and system pages.
  const ALWAYS_ALLOWED = new Set(["profile", "config", "developer-tools", "auth", "onboarding", "sk-panels", ""]);
  const TEXT = {
    en: { locked: "Your sidebar is managed by your administrator.", moved: "That panel isn't available for your user." },
    es: { locked: "Tu barra lateral la administra el administrador.", moved: "Ese panel no está disponible para tu usuario." },
  };
  let rules = null;

  // ------------------------------------------------------------------ selectors (HA 2026.x)
  // Header buttons have no ids, so they are recognised by the start of their MDI icon path.
  const ICONS = {
    search: "M9.5,3A6.5,6.5 0 0,1 16,9.5",      // mdiMagnify
    assistant: "M9,22A1,1 0 0,1 8,21V18H4A2,2",  // mdiCommentProcessingOutline
    edit: "M20.71,7.04C21.1,6.65",               // mdiPencil
    dialog_settings: "M12,8A4,4 0 0,1 16,12A",   // mdiCogOutline
  };
  const SELECTORS = {
    main: {  // home-assistant-main shadow root
      hide_sidebar: "ha-sidebar{display:none!important}ha-drawer{--mdc-drawer-width:0px!important}",
    },
    sidebar: {  // ha-sidebar shadow root
      hide_menubutton: ".menu ha-icon-button{display:none!important}",
      hide_settings: "ha-md-list-item.configuration{display:none!important}",
      hide_notifications: "ha-md-list-item.notifications{display:none!important}",
      hide_account: "ha-md-list-item.user{display:none!important}",
    },
    dashboard: {  // hui-root shadow root
      hide_header: ".header{display:none!important}#view,hui-view-container{padding-top:var(--safe-area-inset-top,0px)!important;min-height:100vh!important}",
      hide_menubutton: "ha-menu-button{display:none!important}",
      hide_search: '[data-skpm-icon="search"]{display:none!important}',
      hide_assistant: '[data-skpm-icon="assistant"]{display:none!important}',
      hide_edit_dashboard: '[data-skpm-icon="edit"]{display:none!important}',
      hide_overflow: ".action-items ha-dropdown{display:none!important}",
    },
    dialog: {  // ha-more-info-dialog shadow root
      hide_dialog_settings: '[data-skpm-icon="dialog_settings"]{display:none!important}',
      hide_dialog_overflow: 'ha-dialog-header ha-dropdown[slot="actionItems"]{display:none!important}',
    },
    document: {  // page <head>
      block_mouse: "home-assistant{pointer-events:none!important}",
    },
  };

  const lang = () => ((document.querySelector("home-assistant")?.hass?.language || navigator.language || "en").startsWith("es") ? "es" : "en");
  const managed = () => !!(rules && rules.managed);

  function notify(key) {
    const ha = document.querySelector("home-assistant");
    if (!ha) return;
    ha.dispatchEvent(new CustomEvent("hass-notification", {
      detail: { message: TEXT[lang()][key] }, bubbles: true, composed: true,
    }));
  }

  function currentPanel() {
    const part = location.pathname.split("/")[1] || "";
    try {
      return decodeURIComponent(part);
    } catch (_) {
      return part;  // malformed address: compare it as is
    }
  }

  // Where a user lands when the panel they opened is hidden.
  function landing() {
    const shown = (rules.allowed || []).filter((p) => !rules.hidden.includes(p));
    const order = (rules.order || []).filter((p) => shown.includes(p));
    for (const p of [rules.default_panel, ...order, ...shown]) {
      if (p && !rules.hidden.includes(p)) return p;
    }
    return "profile";
  }

  function checkLocation() {
    if (!managed() || !rules.settings?.redirect_forbidden) return;
    const panel = currentPanel();
    if (ALWAYS_ALLOWED.has(panel) || !rules.hidden.includes(panel)) return;
    const target = landing();
    if (target === panel) return;
    history.replaceState(null, "", `/${target}`);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: true } }));
    notify("moved");
  }

  // Capture phase on window runs before Home Assistant's own dialog handler.
  window.addEventListener("show-dialog", (ev) => {
    if (ev.detail?.dialogTag !== "dialog-edit-sidebar") return;
    if (!managed() || !rules.settings?.lock_sidebar_editing) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    notify("locked");
  }, true);

  window.addEventListener("location-changed", () => setTimeout(checkLocation, 0));
  window.addEventListener("popstate", () => setTimeout(checkLocation, 0));

  // ------------------------------------------------------------------ kiosk
  const ESCAPE_KEY = "skpm_kiosk_disabled";
  let nativeKiosk = false;

  function deviceId() {
    try {
      let id = localStorage.getItem("skpm_device_id");
      if (!id) {
        id = `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        localStorage.setItem("skpm_device_id", id);
      }
      return id;
    } catch (_) {
      return null;
    }
  }

  // Administrators can turn the kiosk off in this tab with ?skpm_disable (and back with ?skpm_enable).
  function escaped() {
    const q = new URLSearchParams(location.search);
    try {
      if (q.has("skpm_enable")) sessionStorage.removeItem(ESCAPE_KEY);
      if (q.has("skpm_disable") && rules?.is_admin) sessionStorage.setItem(ESCAPE_KEY, "1");
      return sessionStorage.getItem(ESCAPE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function kioskOptions() {
    const k = rules?.kiosk;
    if (!k || escaped()) return {};
    return k.dashboards?.[currentPanel()] || k.default || {};
  }

  function styleIn(root, css) {
    if (!root) return;
    let el = root.querySelector("style[data-skpm]");
    if (!css) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.dataset.skpm = "";
      root.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  function markIcons(root, scope) {
    if (!root) return;
    root.querySelectorAll(scope).forEach((btn) => {
      const path = btn.path || "";
      const hit = Object.entries(ICONS).find(([, start]) => path.startsWith(start));
      if (hit && btn.dataset.skpmIcon !== hit[0]) btn.dataset.skpmIcon = hit[0];
    });
  }

  const sr = (el) => (el && el.shadowRoot) || null;
  const cssFor = (group, opts) => Object.entries(SELECTORS[group]).filter(([k]) => opts[k]).map(([, css]) => css).join("\n");

  let kioskActive = false;  // something applied before: it must be cleaned up when options go away

  function applyKiosk() {
    const opts = kioskOptions();
    const any = Object.keys(opts).length > 0;
    // Users without kiosk options (most of them): no work at all on the page.
    if (!any && !kioskActive) return;
    kioskActive = any;
    const full = !!opts.kiosk;
    // Home Assistant's own kiosk mode hides the sidebar, the menu button and the header buttons.
    if (full !== nativeKiosk) {
      nativeKiosk = full;
      window.dispatchEvent(new CustomEvent("hass-kiosk-mode", { detail: { enable: full } }));
    }
    const effective = full ? { ...opts, hide_header: true } : opts;
    styleIn(document.head, cssFor("document", effective));
    const ha = document.querySelector("home-assistant");
    const main = sr(sr(ha)?.querySelector("home-assistant-main"));
    if (!main) return;
    styleIn(main, cssFor("main", effective));
    styleIn(sr(main.querySelector("ha-sidebar")), cssFor("sidebar", effective));
    const lovelace = main.querySelector("partial-panel-resolver ha-panel-lovelace");
    const root = sr(sr(lovelace)?.querySelector("hui-root"));
    markIcons(root, ".action-items ha-icon-button");
    styleIn(root, cssFor("dashboard", effective));
    const dialog = sr(sr(ha)?.querySelector("ha-more-info-dialog"));
    markIcons(dialog, 'ha-dialog-header ha-icon-button[slot="actionItems"]');
    styleIn(dialog, cssFor("dialog", effective));
  }

  // Panels and dialogs are created as you navigate: re-apply often (it only touches a few nodes).
  let applyTimer = null;
  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyKiosk, 30);
  }
  setInterval(() => { try { applyKiosk(); } catch (_) { /* next tick retries */ } }, 1000);
  window.addEventListener("location-changed", () => { scheduleApply(); setTimeout(applyKiosk, 400); });

  window.addEventListener("hass-more-info", (ev) => {
    if (kioskOptions().block_more_info && ev.detail?.entityId) {
      ev.stopImmediatePropagation();
      return;
    }
    setTimeout(applyKiosk, 60);
    setTimeout(applyKiosk, 400);
  }, true);
  window.addEventListener("contextmenu", (ev) => {
    if (kioskOptions().block_context_menu) ev.preventDefault();
  }, true);

  async function connect() {
    // window.hassConnection is set by Home Assistant's app script; wait for it.
    for (let i = 0; !window.hassConnection && i < 600; i++) await new Promise((r) => setTimeout(r, 100));
    if (!window.hassConnection) return;
    const { conn } = await window.hassConnection;
    // The integration may still be starting: retry for a while, then give up quietly.
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        // The library re-subscribes on its own after a reconnect (Home Assistant restart).
        const sub = { type: `${DOMAIN}/subscribe`, user_agent: navigator.userAgent };
        const id = deviceId();
        if (id) sub.device_id = id;
        await conn.subscribeMessage((msg) => {
          rules = msg;
          // Never let an error here reach Home Assistant's websocket message loop.
          try { checkLocation(); } catch (err) { console.warn("SK Panel Manager:", err); }
          try { applyKiosk(); } catch (err) { console.warn("SK Panel Manager:", err); }
        }, sub);
        return;
      } catch (err) {
        rules = null;
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }

  connect();
})();
