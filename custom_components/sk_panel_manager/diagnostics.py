"""Diagnostics for SK Panel Manager (Settings → Devices & services → ⋮ → Download diagnostics)."""
from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import VERSION
from .discovery import async_users
from .enforcer import PanelEnforcer


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Rules and their effect, without user names, ids or device names."""
    enforcer: PanelEnforcer = entry.runtime_data
    config = enforcer.store.config
    users = [u for u in await async_users(hass) if not u.system_generated]
    alias = {u.id: f"user_{i}" for i, u in enumerate(users, 1)}
    unknown = (f"unknown_user_{i}" for i in range(1, 100000))
    profile_alias = {pid: f"profile_{i}" for i, pid in enumerate(config["profiles"], 1)}
    device_alias = {did: f"device_{i}" for i, did in enumerate(
        dict.fromkeys([*config["devices"], *enforcer.store.device_status]), 1)}
    catalog = enforcer.catalog()

    def user_rules(uid: str, cfg: dict) -> dict[str, Any]:
        return {**cfg, "profiles": [profile_alias.get(p, p) for p in cfg["profiles"]]}

    return {
        "version": VERSION,
        "settings": config["settings"],
        "catalog": [{"url_path": p.url_path, "kind": p.kind, "require_admin": p.require_admin,
                     "default_visible": p.default_visible} for p in catalog],
        "profiles": {profile_alias[pid]: {k: v for k, v in p.items() if k != "name"} for pid, p in config["profiles"].items()},
        "users": {alias.get(uid) or next(unknown): user_rules(uid, cfg) for uid, cfg in config["users"].items()},
        "devices": {device_alias[did]: {"kiosk": d["kiosk"]} for did, d in config["devices"].items()},
        "kiosk": config["kiosk"],
        "effective": {alias[u.id]: _effective(enforcer, u, catalog, profile_alias) for u in users},
        "devices_seen": len(enforcer.store.device_status),
        "users_applied": len(enforcer.store.applied),
    }


def _effective(enforcer: PanelEnforcer, user: Any, catalog: list, profile_alias: dict[str, str]) -> dict[str, Any]:
    eff = enforcer.effective(user, catalog).as_dict()
    eff["sources"] = {
        panel: (f"profile:{profile_alias.get(src[8:], 'unknown')}" if src.startswith("profile:") else src)
        for panel, src in eff["sources"].items()
    }
    return {"is_admin": user.is_admin, "is_owner": user.is_owner, **eff}
