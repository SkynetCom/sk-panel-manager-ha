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
