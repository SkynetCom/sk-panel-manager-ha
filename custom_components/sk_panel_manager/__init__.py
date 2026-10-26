"""SK Panel Manager for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.typing import ConfigType

from .const import (
    CONF_SIDEBAR_TITLE,
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_URL_PATH,
    SIGNAL_EFFECTIVE_CHANGED,
    STATIC_URL,
    VERSION,
    default_sidebar_title,
)
from .enforcer import PanelEnforcer
from .store import PanelManagerStore
from .websocket_api import async_register_websocket

_LOGGER = logging.getLogger(__name__)
# Loaded on every page: locks sidebar editing and redirects hidden panels.
RUNTIME_URL = f"{STATIC_URL}/skpm-runtime.js?v={VERSION}"

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register static files as early as possible (before the config entry)."""
    await _async_register_static(hass)
    return True


async def _async_register_static(hass: HomeAssistant) -> None:
    domain_data = hass.data.setdefault(DOMAIN, {})
    if not domain_data.get("static_registered"):
        await hass.http.async_register_static_paths([
            StaticPathConfig(STATIC_URL, str(Path(__file__).parent / "frontend"), cache_headers=False)
        ])
        domain_data["static_registered"] = True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    await _async_register_static(hass)
    store = PanelManagerStore(hass)
    await store.async_load()
    enforcer = PanelEnforcer(hass, store)

    domain_data = hass.data.setdefault(DOMAIN, {})
    domain_data["enforcer"] = enforcer
    entry.runtime_data = enforcer

    if not domain_data.get("ws_registered"):
        async_register_websocket(hass)
        domain_data["ws_registered"] = True

    await _async_register_panel(hass, entry)
    frontend.add_extra_js_url(hass, RUNTIME_URL)
    await enforcer.async_start()
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def _async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    options = {**entry.data, **entry.options}
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=options.get(CONF_SIDEBAR_TITLE) or default_sidebar_title(hass.config.language),
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/skpm-panel.js?v={VERSION}",
        embed_iframe=False,
        require_admin=True,
        config={"version": VERSION},
    )


async def _async_reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    enforcer: PanelEnforcer = entry.runtime_data
    await enforcer.async_stop()
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
    frontend.remove_extra_js_url(hass, RUNTIME_URL)
    hass.data[DOMAIN].pop("enforcer", None)
    async_dispatcher_send(hass, SIGNAL_EFFECTIVE_CHANGED, None)  # open browsers stop applying rules
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Integration deleted: give every user back their own sidebar, then drop our data."""
    store = PanelManagerStore(hass)
    await store.async_load()
    enforcer = PanelEnforcer(hass, store)
    try:
        await enforcer.async_restore_everyone()
    except Exception:  # noqa: BLE001 - removal must not fail
        _LOGGER.exception("Could not restore the users' sidebars")
        return
    await store.async_remove()
