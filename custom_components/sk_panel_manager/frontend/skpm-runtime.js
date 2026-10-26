// SK Panel Manager — browser module, loaded on every Home Assistant page.
//
// It only acts for users the integration manages, and only uses stable frontend events,
// not Home Assistant's page structure:
// - "show-dialog" with dialogTag "dialog-edit-sidebar" is blocked when sidebar editing is locked
//   (this covers the profile's "Edit" button and the sidebar long-press);
// - "location-changed" / "popstate": a hidden panel opened by its address goes to the user's
//   default dashboard.
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
    return decodeURIComponent(location.pathname.split("/")[1] || "");
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

  async function connect() {
    // window.hassConnection is set by Home Assistant's app script; wait for it.
    for (let i = 0; !window.hassConnection && i < 600; i++) await new Promise((r) => setTimeout(r, 100));
    if (!window.hassConnection) return;
    const { conn } = await window.hassConnection;
    // The integration may still be starting: retry for a while, then give up quietly.
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        // The library re-subscribes on its own after a reconnect (Home Assistant restart).
        await conn.subscribeMessage((msg) => {
          rules = msg;
          checkLocation();
        }, { type: `${DOMAIN}/subscribe` });
        return;
      } catch (err) {
        rules = null;
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }

  connect();
})();
