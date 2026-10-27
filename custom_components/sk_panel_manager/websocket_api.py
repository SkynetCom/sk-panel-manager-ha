"""Websocket API used by the admin panel and the browser module."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.util import dt as dt_util

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send

from .const import DOMAIN, SIGNAL_EFFECTIVE_CHANGED, VERSION
from .discovery import async_user, async_users, panel_as_dict
from .enforcer import PanelEnforcer
from .model import InvalidConfig, validate_config
from .resolver import UserInfo, resolve_kiosk

DEVICE_ID = vol.All(str, vol.Match(r"^[A-Za-z0-9_\-.]{1,64}$"))
MAX_DEVICES = 200

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
    websocket_api.async_register_command(hass, ws_device_forget)


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


def _runtime(enforcer: PanelEnforcer, user: UserInfo, device_id: str | None = None) -> dict[str, Any]:
    """What one user gets on one device, without anything about other users."""
    eff = enforcer.effective(user)
    settings = enforcer.store.config["settings"]
    return {
        **eff.as_dict(),
        "settings": {k: settings[k] for k in RUNTIME_SETTINGS},
        "kiosk": resolve_kiosk(enforcer.store.config, user, device_id),
        "is_admin": user.is_admin,
    }


def _register_device(enforcer: PanelEnforcer, device_id: str, user_id: str, user_agent: str | None) -> None:
    status = enforcer.store.device_status
    if device_id not in status and len(status) >= MAX_DEVICES:
        # Drop the device seen longest ago that the admin hasn't named.
        unnamed = [d for d in status if d not in enforcer.store.config["devices"]]
        if not unnamed:
            return
        status.pop(min(unnamed, key=lambda d: status[d].get("last_seen", "")))
    status[device_id] = {
        "last_user": user_id,
        "last_seen": dt_util.utcnow().isoformat(),
        "user_agent": (user_agent or "")[:300],
    }
    enforcer.store.schedule_save()


async def _admin_payload(hass: HomeAssistant, enforcer: PanelEnforcer) -> dict[str, Any]:
    catalog = enforcer.catalog()
    users = [u for u in await async_users(hass) if not u.system_generated]
    return {
        "version": VERSION,
        "config": enforcer.store.config,
        "catalog": [panel_as_dict(p) for p in catalog],
        "users": [_user_dict(u) for u in users],
        "device_status": enforcer.store.device_status,
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


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/subscribe",
    vol.Optional("device_id"): DEVICE_ID,
    vol.Optional("user_agent"): str,
})
@websocket_api.async_response
async def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Send the calling user's rules (for this device) now and every time they change."""
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    user_id = connection.user.id
    device_id = msg.get("device_id")
    if device_id:
        _register_device(enforcer, device_id, user_id, msg.get("user_agent"))

    async def _send() -> None:
        # Look the enforcer up each time: reloading the integration replaces it.
        current = _enforcer(hass)
        if current is None:
            # Integration unloaded or removed: the browser stops applying rules.
            connection.send_message(websocket_api.event_message(msg["id"], {"managed": False, "reason": "not_loaded"}))
            return
        user = await async_user(hass, user_id)
        if user is not None:
            connection.send_message(websocket_api.event_message(msg["id"], _runtime(current, user, device_id)))

    @callback
    def _changed(changed_user: str | None) -> None:
        if changed_user in (None, user_id):
            hass.async_create_task(_send())

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_EFFECTIVE_CHANGED, _changed)
    connection.send_result(msg["id"])
    await _send()


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/device/forget",
    vol.Required("device_id"): DEVICE_ID,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_device_forget(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Remove a device from the list (and its kiosk settings)."""
    if (enforcer := _enforcer(hass)) is None:
        return _not_loaded(connection, msg)
    enforcer.store.device_status.pop(msg["device_id"], None)
    if enforcer.store.config["devices"].pop(msg["device_id"], None) is not None:
        await enforcer.store.async_save_config(enforcer.store.config)
        async_dispatcher_send(hass, SIGNAL_EFFECTIVE_CHANGED, None)
    else:
        enforcer.store.schedule_save()
    connection.send_result(msg["id"], await _admin_payload(hass, enforcer))
