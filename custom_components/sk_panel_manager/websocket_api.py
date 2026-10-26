"""Websocket API used by the admin panel and the browser module."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send

from .const import DOMAIN, SIGNAL_EFFECTIVE_CHANGED, VERSION
from .discovery import async_user, async_users, panel_as_dict
from .enforcer import PanelEnforcer
from .model import InvalidConfig, validate_config
from .resolver import UserInfo

# Settings the browser module needs; the rest of the configuration stays admin-only.
RUNTIME_SETTINGS = ("lock_sidebar_editing", "redirect_forbidden")


def _enforcer(hass: HomeAssistant) -> PanelEnforcer | None:
    return hass.data.get(DOMAIN, {}).get("enforcer")


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_config)
    websocket_api.async_register_command(hass, ws_save)
    websocket_api.async_register_command(hass, ws_effective)
    websocket_api.async_register_command(hass, ws_subscribe)


def _not_loaded(connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_error(msg["id"], "not_loaded", "SK Panel Manager is not loaded")


def _user_dict(user: UserInfo) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "is_admin": user.is_admin,
        "is_owner": user.is_owner,
        "system_generated": user.system_generated,
    }


def _runtime(enforcer: PanelEnforcer, user: UserInfo) -> dict[str, Any]:
    """What one user gets, without anything about other users."""
    eff = enforcer.effective(user)
    settings = enforcer.store.config["settings"]
    return {
        **eff.as_dict(),
        "settings": {k: settings[k] for k in RUNTIME_SETTINGS},
    }


async def _admin_payload(hass: HomeAssistant, enforcer: PanelEnforcer) -> dict[str, Any]:
    catalog = enforcer.catalog()
    users = [u for u in await async_users(hass) if not u.system_generated]
    return {
        "version": VERSION,
        "config": enforcer.store.config,
        "catalog": [panel_as_dict(p) for p in catalog],
        "users": [_user_dict(u) for u in users],
        "effective": {u.id: enforcer.effective(u, catalog).as_dict() for u in users},
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/config"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_config(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    connection.send_result(msg["id"], await _admin_payload(hass, enforcer))


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/config/save",
    vol.Required("config"): dict,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    try:
        config = validate_config(msg["config"])
    except InvalidConfig as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return
    await enforcer.store.async_save_config(config)
    await enforcer.async_apply_all()
    # Runtime settings may have changed for everyone, even with the same panels.
    async_dispatcher_send(hass, SIGNAL_EFFECTIVE_CHANGED, None)
    connection.send_result(msg["id"], await _admin_payload(hass, enforcer))


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/effective",
    vol.Optional("user_id"): str,
})
@websocket_api.async_response
async def ws_effective(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    user_id = msg.get("user_id", connection.user.id)
    if user_id != connection.user.id and not connection.user.is_admin:
        raise Unauthorized
    user = await async_user(hass, user_id)
    if user is None:
        connection.send_error(msg["id"], "not_found", "Unknown user")
        return
    connection.send_result(msg["id"], _runtime(enforcer, user))


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@websocket_api.async_response
async def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Send the calling user's rules now and every time they change."""
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    user_id = connection.user.id

    async def _send() -> None:
        user = await async_user(hass, user_id)
        if user is not None:
            connection.send_message(websocket_api.event_message(msg["id"], _runtime(enforcer, user)))

    @callback
    def _changed(changed_user: str | None) -> None:
        if changed_user in (None, user_id):
            hass.async_create_task(_send())

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_EFFECTIVE_CHANGED, _changed)
    connection.send_result(msg["id"])
    await _send()
