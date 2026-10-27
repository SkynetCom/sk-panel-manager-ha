"""Constants for SK Panel Manager."""
from __future__ import annotations

DOMAIN = "sk_panel_manager"
NAME = "SK Panel Manager"
VERSION = "1.0.1"

STORAGE_KEY = f"{DOMAIN}.data"
STORAGE_VERSION = 1

PANEL_URL_PATH = "sk-panels"
PANEL_COMPONENT = "sk-panel-manager-panel"
PANEL_ICON = "mdi:view-dashboard-edit"
STATIC_URL = "/sk_panel_manager_static"

CONF_SIDEBAR_TITLE = "sidebar_title"
DEFAULT_SIDEBAR_TITLE = "Panels"

# Keys of Home Assistant's own per-user / system frontend storage.
USER_DATA_SIDEBAR = "sidebar"          # {"panelOrder": [...], "hiddenPanels": [...]}
USER_DATA_CORE = "core"                # {"default_panel": "<url_path>"}
SYSTEM_DATA_CORE = "core"              # {"default_panel": "<url_path>"}
FALLBACK_DEFAULT_PANEL = "lovelace"

# Panels that are not shown as sidebar items or must never be hidden.
UNMANAGED_PANELS = frozenset({"profile", "config", "developer-tools", "notfound", PANEL_URL_PATH})

ACCESS_ALLOW = "allow"
ACCESS_DENY = "deny"
ACCESS_VALUES = (ACCESS_ALLOW, ACCESS_DENY)

SIGNAL_EFFECTIVE_CHANGED = f"{DOMAIN}_effective_changed"


def default_sidebar_title(language: str | None) -> str:
    """Sidebar title for a new install, in the Home Assistant language."""
    return "Paneles" if (language or "").startswith("es") else DEFAULT_SIDEBAR_TITLE
