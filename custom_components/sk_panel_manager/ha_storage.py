"""The only place that touches Home Assistant's internal frontend storage.

``homeassistant.components.frontend.storage`` is not a public API. It is what the profile's
"Edit sidebar" dialog and "Default dashboard" picker use, so writing there is what makes the
sidebar change for real. Keeping every call here means a change in Home Assistant is fixed in
one file.
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.components.frontend import storage as fe_storage
from homeassistant.core import HomeAssistant

from .const import SYSTEM_DATA_CORE, USER_DATA_CORE, USER_DATA_SIDEBAR


class UserFrontendData:
    """Sidebar and default panel of one user."""

    def __init__(self, store: Any) -> None:
        self._store = store

    @property
    def sidebar(self) -> dict[str, Any] | None:
        value = self._store.data.get(USER_DATA_SIDEBAR)
        return dict(value) if isinstance(value, dict) else None

    @property
    def core(self) -> dict[str, Any]:
        value = self._store.data.get(USER_DATA_CORE)
        return dict(value) if isinstance(value, dict) else {}

    async def async_set_sidebar(self, value: dict[str, Any] | None) -> None:
        await self._store.async_set_item(USER_DATA_SIDEBAR, value)

    async def async_set_core(self, value: dict[str, Any]) -> None:
        await self._store.async_set_item(USER_DATA_CORE, value)

    def subscribe(self, on_change: Callable[[], None]) -> Callable[[], None]:
        unsubs = [
            self._store.async_subscribe(USER_DATA_SIDEBAR, on_change),
            self._store.async_subscribe(USER_DATA_CORE, on_change),
        ]

        def unsubscribe() -> None:
            for unsub in unsubs:
                try:
                    unsub()
                except ValueError:  # already removed
                    pass

        return unsubscribe


async def async_user_data(hass: HomeAssistant, user_id: str) -> UserFrontendData:
    return UserFrontendData(await fe_storage.async_user_store(hass, user_id))


async def async_system_default_panel(hass: HomeAssistant) -> str | None:
    """Default dashboard set for everyone (Home Assistant 2025.12+), if any."""
    system_store = getattr(fe_storage, "async_system_store", None)
    if system_store is None:
        return None
    store = await system_store(hass)
    core = store.data.get(SYSTEM_DATA_CORE)
    value = core.get("default_panel") if isinstance(core, dict) else None
    return value if isinstance(value, str) else None
