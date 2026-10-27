// Mirror of resolver.py, so the editor can preview unsaved changes.
// Keep both in sync: tests/test_resolver_parity.py runs the same cases through each.

export function unmanagedReason(config, user) {
  if (user.system_generated) return "system";
  if (user.is_owner) return "owner";
  if (user.is_admin && !config.settings.restrict_admins) return "admin";
  const userCfg = config.users[user.id];
  if (userCfg && userCfg.managed === false) return "excluded";
  return null;
}

// Returns [access, source] for one panel.
export function decide(config, userCfg, panel) {
  if (userCfg && userCfg.panels && panel in userCfg.panels) return [userCfg.panels[panel], "user"];
  const values = [];
  for (const pid of (userCfg && userCfg.profiles) || []) {
    const profile = config.profiles[pid];
    if (profile && profile.panels && panel in profile.panels) values.push([profile.panels[panel], pid]);
  }
  const allow = values.find(([v]) => v === "allow");
  if (allow) return ["allow", `profile:${allow[1]}`];
  if (values.length) return ["deny", `profile:${values[0][1]}`];
  return [config.settings.default_access, "default"];
}

export function referencedPanels(config) {
  const out = new Set();
  for (const item of [...Object.values(config.profiles), ...Object.values(config.users)]) {
    for (const p of Object.keys(item.panels || {})) out.add(p);
  }
  return out;
}

export function firstAllowed(eff) {
  for (const p of [...(eff.order || []), ...eff.allowed]) if (eff.allowed.includes(p)) return p;
  return null;
}

export function resolve(config, user, catalog) {
  const reason = unmanagedReason(config, user);
  if (reason) {
    return { managed: false, reason, allowed: [], hidden: [], order: null, default_panel: null, sources: {} };
  }
  const userCfg = config.users[user.id];
  const visible = catalog.filter((p) => !(p.require_admin && !user.is_admin)).map((p) => p.url_path);
  const ids = [...new Set([...visible, ...[...referencedPanels(config)].sort()])];
  const eff = { managed: true, reason: null, allowed: [], hidden: [], order: null, default_panel: null, sources: {} };
  for (const panel of ids) {
    const [access, source] = decide(config, userCfg, panel);
    eff.sources[panel] = source;
    if (access === "allow") {
      if (visible.includes(panel)) eff.allowed.push(panel);
    } else {
      eff.hidden.push(panel);
    }
  }
  const profiles = ((userCfg && userCfg.profiles) || []).map((p) => config.profiles[p]).filter(Boolean);
  let order = userCfg ? userCfg.panel_order : null;
  if (order == null) order = (profiles.find((p) => p.panel_order && p.panel_order.length) || {}).panel_order || null;
  if (order != null) eff.order = order.filter((p) => eff.allowed.includes(p));
  let def = userCfg ? userCfg.default_panel : null;
  if (def == null) def = (profiles.find((p) => p.default_panel) || {}).default_panel || null;
  if (def != null && !eff.allowed.includes(def)) def = firstAllowed(eff);
  eff.default_panel = def;
  return eff;
}

// ---------------------------------------------------------------- kiosk (mirror of resolve_kiosk)
function layer(kiosk, panel) {
  if (!kiosk) return [];
  const out = [kiosk.all || {}];
  if (panel != null && kiosk.dashboards && panel in kiosk.dashboards) out.push(kiosk.dashboards[panel]);
  return out;
}

function mergeProfiles(layers) {
  const out = {};
  for (const opts of layers) for (const [k, v] of Object.entries(opts)) out[k] = (out[k] || false) || v;
  return out;
}

export function kioskPanels(config) {
  const layers = [config.kiosk, ...Object.values(config.profiles).map((p) => p.kiosk),
    ...Object.values(config.users).map((u) => u.kiosk), ...Object.values(config.devices || {}).map((d) => d.kiosk)];
  const out = new Set();
  for (const k of layers) if (k) for (const p of Object.keys(k.dashboards || {})) out.add(p);
  return out;
}

export function resolveKioskFor(config, user, deviceId, panel) {
  let out = {};
  if (unmanagedReason(config, user) === null) {
    for (const opts of layer(config.kiosk, panel)) Object.assign(out, opts);
    const userCfg = config.users[user.id] || {};
    const profiles = (userCfg.profiles || []).map((p) => config.profiles[p]).filter(Boolean);
    for (const part of [0, 1]) {
      Object.assign(out, mergeProfiles(profiles.map((p) => layer(p.kiosk, panel)).filter((l) => l.length > part).map((l) => l[part])));
    }
    for (const opts of layer(userCfg.kiosk, panel)) Object.assign(out, opts);
  }
  const device = deviceId ? (config.devices || {})[deviceId] : null;
  for (const opts of layer(device && device.kiosk, panel)) Object.assign(out, opts);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

export function resolveKiosk(config, user, deviceId) {
  const def = resolveKioskFor(config, user, deviceId, null);
  const dashboards = {};
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  for (const panel of [...kioskPanels(config)].sort()) {
    const opts = resolveKioskFor(config, user, deviceId, panel);
    if (!same(opts, def)) dashboards[panel] = opts;
  }
  return { default: def, dashboards };
}
