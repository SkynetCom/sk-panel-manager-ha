// Backup (export / import) and the Kiosk Mode importer. Pure functions: nothing here saves anything,
// the panel puts the result in the draft and the admin reviews it and presses Save.

export const BACKUP_FORMAT = "sk_panel_manager";

// ---------------------------------------------------------------- backup
export function makeBackup(config, users, version) {
  return {
    format: BACKUP_FORMAT,
    version,
    exported_at: new Date().toISOString(),
    // Names let an import into another Home Assistant (with other user ids) find the same people.
    users: Object.fromEntries(users.map((u) => [u.id, u.name])),
    config: JSON.parse(JSON.stringify(config)),
  };
}

const norm = (s) => String(s || "").trim().toLowerCase();

// Returns { config, report } or throws an Error with a readable message.
export function readBackup(data, users) {
  if (!data || typeof data !== "object" || data.format !== BACKUP_FORMAT || typeof data.config !== "object") {
    throw new Error("not_a_backup");
  }
  const config = JSON.parse(JSON.stringify(data.config));
  const names = data.users || {};
  const byId = new Map(users.map((u) => [u.id, u]));
  const byName = new Map(users.map((u) => [norm(u.name), u]));
  const report = { kept: 0, matched: [], dropped: [] };
  const out = {};
  for (const [id, cfg] of Object.entries(config.users || {})) {
    if (byId.has(id)) {
      out[id] = cfg;
      report.kept++;
      continue;
    }
    const match = byName.get(norm(names[id]));
    if (match && !out[match.id]) {
      out[match.id] = cfg;
      report.matched.push(names[id]);
    } else {
      report.dropped.push(names[id] || id);
    }
  }
  // Fill what an older or hand-edited file may lack, so the panel can show it (the server validates on save).
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  config.users = Object.fromEntries(Object.entries(out).map(([id, u]) => [id, {
    profiles: [], panels: {}, panel_order: null, default_panel: null, kiosk: null, managed: true, ...obj(u),
  }]));
  config.settings = obj(config.settings);
  config.profiles = Object.fromEntries(Object.entries(obj(config.profiles)).map(([id, p]) => [id, {
    name: id, icon: "mdi:account-group", color: null, panels: {}, panel_order: null, default_panel: null, kiosk: null, ...obj(p),
  }]));
  config.devices = obj(config.devices);
  if (!("kiosk" in config)) config.kiosk = null;
  return { config, report };
}

// ---------------------------------------------------------------- Kiosk Mode
// https://github.com/NemesisRE/kiosk-mode options → ours.
const SAME = ["kiosk", "hide_header", "hide_sidebar", "hide_menubutton", "hide_settings", "hide_notifications",
  "hide_account", "hide_search", "hide_assistant", "hide_overflow", "hide_edit_dashboard", "block_mouse",
  "block_context_menu"];
const MAP = {
  block_overflow: ["hide_overflow"],
  hide_dialog_header_settings: ["hide_dialog_settings"],
  hide_dialog_header_overflow: ["hide_dialog_overflow"],
  hide_dialog_header_action_items: ["hide_dialog_settings", "hide_dialog_overflow"],
};
// Kiosk Mode utility keys: not options, nothing to report.
const QUIET = new Set(["ignore_entity_settings", "ignore_mobile_settings", "ignore_disable_km", "debug", "debug_template"]);
const BLOCKS = new Set(["admin_settings", "non_admin_settings", "user_settings", "mobile_settings", "entity_settings"]);

function convertOptions(raw, where, skipped) {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (BLOCKS.has(key) || QUIET.has(key)) continue;
    const targets = SAME.includes(key) ? [key] : MAP[key];
    if (!targets) {
      skipped.push({ ...where, key, reason: "unsupported" });
      continue;
    }
    if (typeof value !== "boolean") {
      skipped.push({ ...where, key, reason: "template" });
      continue;
    }
    for (const t of targets) out[t] = value;
  }
  return out;
}

// dashboards: [{ url_path, title, kiosk_mode }] (only those that have a kiosk_mode block).
// Returns { general: {url: opts}, users: {userId: {url: opts}}, skipped: [...], unmatched: [...], found: n }.
export function convertKioskMode(dashboards, users) {
  const byName = new Map(users.filter((u) => !u.system_generated).map((u) => [norm(u.name), u]));
  const result = { general: {}, users: {}, skipped: [], unmatched: [], found: dashboards.length };
  for (const d of dashboards) {
    const km = d.kiosk_mode || {};
    const where = { dashboard: d.url_path };
    const general = { ...convertOptions(km, where, result.skipped),
      ...convertOptions(km.non_admin_settings, { ...where, block: "non_admin_settings" }, result.skipped) };
    if (Object.keys(general).length) result.general[d.url_path] = general;
    if (km.admin_settings) result.skipped.push({ ...where, key: "admin_settings", reason: "admins" });
    if (km.mobile_settings) result.skipped.push({ ...where, key: "mobile_settings", reason: "mobile" });
    if (km.entity_settings) result.skipped.push({ ...where, key: "entity_settings", reason: "entity" });
    for (const entry of Array.isArray(km.user_settings) ? km.user_settings : []) {
      const opts = convertOptions(entry, { ...where, block: "user_settings" }, result.skipped);
      delete opts.users;
      const names = Array.isArray(entry.users) ? entry.users : entry.users ? [entry.users] : [];
      for (const name of names) {
        const user = byName.get(norm(name));
        if (!user) {
          if (!result.unmatched.includes(name)) result.unmatched.push(name);
          continue;
        }
        if (!Object.keys(opts).length) continue;
        result.users[user.id] = result.users[user.id] || {};
        result.users[user.id][d.url_path] = { ...(result.users[user.id][d.url_path] || {}), ...opts };
      }
    }
  }
  // "users" inside user_settings is the list of names, not an option.
  result.skipped = result.skipped.filter((s) => s.key !== "users");
  return result;
}

// Puts a conversion into a configuration (imported values win over existing ones).
export function applyKioskImport(config, conv, makeUser) {
  const into = (layer, url, opts) => {
    layer.dashboards[url] = { ...(layer.dashboards[url] || {}), ...opts };
  };
  if (Object.keys(conv.general).length) {
    config.kiosk = config.kiosk || { all: {}, dashboards: {} };
    for (const [url, opts] of Object.entries(conv.general)) into(config.kiosk, url, opts);
  }
  for (const [uid, dashes] of Object.entries(conv.users)) {
    const user = makeUser(uid);
    user.kiosk = user.kiosk || { all: {}, dashboards: {} };
    for (const [url, opts] of Object.entries(dashes)) into(user.kiosk, url, opts);
  }
  return config;
}
