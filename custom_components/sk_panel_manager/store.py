"""Persistent storage for SK Panel Manager."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .model import normalize_config

SAVE_DELAY = 1


class PanelManagerStore:
    """Configuration plus what was applied to each user (to undo it later).

    ``applied[user_id]``: what the integration wrote last time (hidden panels, default panel,
    whether it set the order). ``snapshots[user_id]``: the user's own sidebar and default panel
    before the integration touched them, restored when the user is released or the integration
    is removed.
    """

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.config: dict[str, Any] = normalize_config({})
        self.applied: dict[str, dict[str, Any]] = {}
        self.snapshots: dict[str, dict[str, Any]] = {}
        # Browsers seen by the browser module: {device_id: {last_user, last_seen, user_agent}}.
        self.device_status: dict[str, dict[str, Any]] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self.config = normalize_config(data.get("config"))
        self.applied = data.get("applied") if isinstance(data.get("applied"), dict) else {}
        self.snapshots = data.get("snapshots") if isinstance(data.get("snapshots"), dict) else {}
        status = data.get("device_status")
        self.device_status = status if isinstance(status, dict) else {}

    def _data(self) -> dict[str, Any]:
        return {"config": self.config, "applied": self.applied, "snapshots": self.snapshots,
                "device_status": self.device_status}

    def schedule_save(self) -> None:
        self._store.async_delay_save(self._data, SAVE_DELAY)

    async def async_save_config(self, config: dict[str, Any]) -> None:
        self.config = config
        await self._store.async_save(self._data())

    async def async_flush(self) -> None:
        await self._store.async_save(self._data())

    async def async_remove(self) -> None:
        await self._store.async_remove()
