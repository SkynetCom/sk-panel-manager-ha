"""Configuration model: normalisation and validation (pure Python, no Home Assistant)."""
from __future__ import annotations

import re
from typing import Any

ACCESS_VALUES = ("allow", "deny")

# Kiosk options, grouped as the editor shows them. Values are booleans.
KIOSK_OPTIONS: dict[str, tuple[str, ...]] = {
    "screen": (
        "kiosk", "hide_header", "hide_sidebar", "hide_menubutton", "hide_search", "hide_assistant",
        "hide_notifications", "hide_account", "hide_settings", "hide_overflow", "hide_edit_dashboard",
        "hide_refresh",
    ),
    "dialogs": (
        "hide_dialog_header", "hide_dialog_history", "hide_dialog_logbook", "hide_dialog_settings",
        "hide_dialog_actions",
    ),
    "interaction": ("block_context_menu", "block_mouse"),
}
KIOSK_KEYS = frozenset(k for group in KIOSK_OPTIONS.values() for k in group)

DEFAULT_SETTINGS: dict[str, Any] = {
    "default_access": "allow",      # access to a panel nobody configured
    "restrict_admins": False,       # admins are only managed when this is on (owner never)
    "lock_sidebar_editing": True,   # managed users can't edit their sidebar in the profile
    "redirect_forbidden": True,     # opening a hidden panel by URL goes to the default one
}

_ID_RE = re.compile(r"^[A-Za-z0-9_\-.]{1,64}$")
_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
MAX_NAME = 60


class InvalidConfig(ValueError):
    """Raised when a configuration sent by the panel is not valid."""


def _valid_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_ID_RE.match(value))


def _panel_id(value: Any) -> bool:
    # Panel url paths: "lovelace", "dashboard-kids", "energy", "hassio", ...
    return isinstance(value, str) and 0 < len(value) <= 100 and "/" not in value


def normalize_access(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {p: v for p, v in value.items() if _panel_id(p) and v in ACCESS_VALUES}


def normalize_order(value: Any) -> list[str] | None:
    if not isinstance(value, list):
        return None
    seen: list[str] = []
    for item in value:
        if _panel_id(item) and item not in seen:
            seen.append(item)
    return seen or None


def normalize_kiosk(value: Any) -> dict[str, bool] | None:
    if not isinstance(value, dict):
        return None
    out = {k: bool(v) for k, v in value.items() if k in KIOSK_KEYS and isinstance(v, bool)}
    return out or None


def _name(value: Any, fallback: str) -> str:
    if not isinstance(value, str) or not value.strip():
        return fallback
    return value.strip()[:MAX_NAME]


def normalize_profile(pid: str, data: Any) -> dict[str, Any]:
    data = data if isinstance(data, dict) else {}
    color = data.get("color")
    icon = data.get("icon")
    default_panel = data.get("default_panel")
    return {
        "name": _name(data.get("name"), pid),
        "icon": icon if isinstance(icon, str) and icon.startswith("mdi:") else "mdi:account-group",
        "color": color if isinstance(color, str) and _COLOR_RE.match(color) else None,
        "panels": normalize_access(data.get("panels")),
        "panel_order": normalize_order(data.get("panel_order")),
        "default_panel": default_panel if _panel_id(default_panel) else None,
        "kiosk": normalize_kiosk(data.get("kiosk")),
    }


def normalize_user(data: Any, profile_ids: set[str]) -> dict[str, Any]:
    data = data if isinstance(data, dict) else {}
    profiles = data.get("profiles") if isinstance(data.get("profiles"), list) else []
    default_panel = data.get("default_panel")
    return {
        "profiles": [p for i, p in enumerate(profiles) if p in profile_ids and p not in profiles[:i]],
        "panels": normalize_access(data.get("panels")),
        "panel_order": normalize_order(data.get("panel_order")),
        "default_panel": default_panel if _panel_id(default_panel) else None,
        "kiosk": normalize_kiosk(data.get("kiosk")),
        "managed": data.get("managed", True) is not False,
    }


def normalize_settings(data: Any) -> dict[str, Any]:
    data = data if isinstance(data, dict) else {}
    out = dict(DEFAULT_SETTINGS)
    if data.get("default_access") in ACCESS_VALUES:
        out["default_access"] = data["default_access"]
    for key in ("restrict_admins", "lock_sidebar_editing", "redirect_forbidden"):
        if isinstance(data.get(key), bool):
            out[key] = data[key]
    return out


def normalize_config(data: Any) -> dict[str, Any]:
    """Return a clean configuration, silently dropping anything invalid."""
    data = data if isinstance(data, dict) else {}
    raw_profiles = data.get("profiles") if isinstance(data.get("profiles"), dict) else {}
    profiles = {pid: normalize_profile(pid, p) for pid, p in raw_profiles.items() if _valid_id(pid)}
    raw_users = data.get("users") if isinstance(data.get("users"), dict) else {}
    users = {uid: normalize_user(u, set(profiles)) for uid, u in raw_users.items() if _valid_id(uid)}
    return {
        "settings": normalize_settings(data.get("settings")),
        "profiles": profiles,
        "users": users,
        "kiosk": normalize_kiosk(data.get("kiosk")),
    }


def validate_config(data: Any) -> dict[str, Any]:
    """Strict check for configurations saved from the panel, then normalise."""
    if not isinstance(data, dict):
        raise InvalidConfig("Configuration must be an object")
    for section in ("profiles", "users"):
        value = data.get(section, {})
        if not isinstance(value, dict):
            raise InvalidConfig(f"'{section}' must be an object")
        for key in value:
            if not _valid_id(key):
                raise InvalidConfig(f"Invalid id in '{section}': {key!r}")
    for section_name, section in (("profiles", data.get("profiles", {})), ("users", data.get("users", {}))):
        for key, item in section.items():
            if not isinstance(item, dict):
                raise InvalidConfig(f"{section_name}.{key} must be an object")
            for panel, value in (item.get("panels") or {}).items():
                if value not in ACCESS_VALUES:
                    raise InvalidConfig(f"{section_name}.{key}.panels.{panel}: must be allow or deny")
    profile_ids = set(data.get("profiles") or {})
    for uid, user in (data.get("users") or {}).items():
        profiles = user.get("profiles") or []
        if not isinstance(profiles, list):
            raise InvalidConfig(f"users.{uid}.profiles must be a list")
        for pid in profiles:
            if pid not in profile_ids:
                raise InvalidConfig(f"users.{uid}: unknown profile {pid!r}")
    return normalize_config(data)
