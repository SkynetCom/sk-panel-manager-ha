"""Read panels and users from Home Assistant."""
from __future__ import annotations

from homeassistant.components.frontend import DATA_PANELS
from homeassistant.core import HomeAssistant

from .const import FALLBACK_DEFAULT_PANEL, UNMANAGED_PANELS
from .resolver import PanelInfo, UserInfo


def panel_catalog(hass: HomeAssistant) -> list[PanelInfo]:
    """Panels that can appear in the sidebar, in registration order."""
    out: list[PanelInfo] = []
    for url_path, panel in hass.data.get(DATA_PANELS, {}).items():
        if url_path in UNMANAGED_PANELS:
            continue
        # The main dashboard is registered without a title (the frontend names it).
        if not panel.sidebar_title and url_path != FALLBACK_DEFAULT_PANEL:
            continue
        out.append(PanelInfo(
            url_path=url_path,
            title=panel.sidebar_title,
            icon=panel.sidebar_icon,
            require_admin=bool(panel.require_admin),
            default_visible=bool(getattr(panel, "sidebar_default_visible", True)),
        ))
    return out


def panel_as_dict(panel: PanelInfo) -> dict:
    return {
        "url_path": panel.url_path,
        "title": panel.title,
        "icon": panel.icon,
        "require_admin": panel.require_admin,
        "default_visible": panel.default_visible,
    }


async def async_users(hass: HomeAssistant) -> list[UserInfo]:
    """Every user, including inactive ones (system users are kept but never managed)."""
    return [
        UserInfo(
            id=user.id,
            name=user.name or "",
            is_admin=user.is_admin,
            is_owner=user.is_owner,
            system_generated=user.system_generated,
        )
        for user in await hass.auth.async_get_users()
    ]


async def async_user(hass: HomeAssistant, user_id: str) -> UserInfo | None:
    user = await hass.auth.async_get_user(user_id)
    if user is None:
        return None
    return UserInfo(
        id=user.id,
        name=user.name or "",
        is_admin=user.is_admin,
        is_owner=user.is_owner,
        system_generated=user.system_generated,
    )
