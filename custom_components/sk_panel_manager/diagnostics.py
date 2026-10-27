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
        "users": {alias.get(uid, "unknown_user"): user_rules(uid, cfg) for uid, cfg in config["users"].items()},
        "devices": {device_alias[did]: {"kiosk": d["kiosk"]} for did, d in config["devices"].items()},
        "kiosk": config["kiosk"],
        "effective": {
            alias[u.id]: {"is_admin": u.is_admin, "is_owner": u.is_owner, **enforcer.effective(u, catalog).as_dict()}
            for u in users
        },
        "devices_seen": len(enforcer.store.device_status),
        "users_applied": len(enforcer.store.applied),
    }
