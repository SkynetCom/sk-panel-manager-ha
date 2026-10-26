"""Write each user's sidebar and default dashboard, and keep them that way."""
from __future__ import annotations

import asyncio
from collections.abc import Callable
import copy
import logging
from typing import Any

from homeassistant.auth import EVENT_USER_ADDED, EVENT_USER_REMOVED, EVENT_USER_UPDATED
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, EVENT_PANELS_UPDATED
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import FALLBACK_DEFAULT_PANEL, SIGNAL_EFFECTIVE_CHANGED
from .discovery import async_user, async_users, panel_catalog
from .ha_storage import async_system_default_panel, async_user_data
from .resolver import Effective, PanelInfo, UserInfo, first_allowed, merge_hidden, resolve, restore_hidden
from .store import PanelManagerStore

_LOGGER = logging.getLogger(__name__)


class PanelEnforcer:
    """Applies the configuration to Home Assistant's per-user frontend storage."""

    def __init__(self, hass: HomeAssistant, store: PanelManagerStore) -> None:
        self.hass = hass
        self.store = store
        self._lock = asyncio.Lock()
        self._listeners: list[Callable[[], None]] = []
        self._user_subs: dict[str, Callable[[], None]] = {}
        self._started = False
        self._debouncer = Debouncer(
            hass, _LOGGER, cooldown=1.0, immediate=False, function=self.async_apply_all
        )

    # ------------------------------------------------------------------ lifecycle
    async def async_start(self) -> None:
        self._listeners.append(self.hass.bus.async_listen(EVENT_PANELS_UPDATED, self._schedule_all))
        self._listeners.append(self.hass.bus.async_listen(EVENT_USER_ADDED, self._user_event))
        self._listeners.append(self.hass.bus.async_listen(EVENT_USER_UPDATED, self._user_event))
        self._listeners.append(self.hass.bus.async_listen(EVENT_USER_REMOVED, self._user_removed))
        if self.hass.state is CoreState.running:
            await self._async_first_apply()
        else:
            # Panels of other integrations are still registering: wait for a full catalog.
            self._listeners.append(self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STARTED, self._started_event
            ))

    async def async_stop(self) -> None:
        for unsub in self._listeners:
            unsub()
        self._listeners.clear()
        for unsub in self._user_subs.values():
            unsub()
        self._user_subs.clear()
        self._debouncer.async_cancel()
        await self.store.async_flush()

    async def _started_event(self, _event: Event) -> None:
        await self._async_first_apply()

    async def _async_first_apply(self) -> None:
        self._started = True
        await self.async_apply_all()

    @callback
    def _schedule_all(self, _event: Event | None = None) -> None:
        if self._started:
            self._debouncer.async_schedule_call()

    async def _user_event(self, event: Event) -> None:
        if self._started and (user_id := event.data.get("user_id")):
            await self.async_apply_user_id(user_id)

    async def _user_removed(self, event: Event) -> None:
        user_id = event.data.get("user_id")
        if unsub := self._user_subs.pop(user_id, None):
            unsub()
        self.store.applied.pop(user_id, None)
        self.store.snapshots.pop(user_id, None)
        self.store.schedule_save()

    # ------------------------------------------------------------------ queries
    def catalog(self) -> list[PanelInfo]:
        return panel_catalog(self.hass)

    def effective(self, user: UserInfo, catalog: list[PanelInfo] | None = None) -> Effective:
        return resolve(self.store.config, user, catalog if catalog is not None else self.catalog())

    # ------------------------------------------------------------------ apply
    async def async_apply_all(self) -> None:
        catalog = self.catalog()
        for user in await async_users(self.hass):
            await self._async_apply(user, catalog)

    async def async_apply_user_id(self, user_id: str) -> None:
        user = await async_user(self.hass, user_id)
        if user is not None:
            await self._async_apply(user, self.catalog())

    async def _async_apply(self, user: UserInfo, catalog: list[PanelInfo]) -> None:
        async with self._lock:
            try:
                eff = self.effective(user, catalog)
                changed = await (self._async_enforce(user, eff, catalog) if eff.managed
                                 else self._async_release(user.id))
            except Exception:  # noqa: BLE001 - one user must never stop the others
                _LOGGER.exception("Could not apply the panel configuration to user %s", user.id)
                return
        if changed:
            async_dispatcher_send(self.hass, SIGNAL_EFFECTIVE_CHANGED, user.id)

    async def _async_enforce(self, user: UserInfo, eff: Effective, catalog: list[PanelInfo]) -> bool:
        data = await async_user_data(self.hass, user.id)
        self._ensure_subscribed(user.id, data)
        sidebar = data.sidebar
        core = data.core
        applied = self.store.applied.get(user.id) or {"hidden": [], "default_panel": None, "order": False}

        if user.id not in self.store.snapshots:
            self.store.snapshots[user.id] = {
                "sidebar": copy.deepcopy(sidebar),
                "default_panel": core.get("default_panel"),
            }

        current = sidebar or {}
        current_hidden = current.get("hiddenPanels")
        if not isinstance(current_hidden, list):
            # Never edited: the frontend hides panels registered as not visible by default.
            current_hidden = [p.url_path for p in catalog if not p.default_visible]
            self.store.snapshots[user.id].setdefault("seeded_hidden", current_hidden)
        new_hidden = merge_hidden(current_hidden, applied.get("hidden", []), eff.hidden)
        current_order = current.get("panelOrder") if isinstance(current.get("panelOrder"), list) else []
        new_order = eff.order if eff.order is not None else current_order
        new_sidebar = {**current, "panelOrder": new_order, "hiddenPanels": new_hidden}

        changed = False
        if new_sidebar != sidebar:
            await data.async_set_sidebar(new_sidebar)
            changed = True

        target = eff.default_panel
        if target is None:
            landing = (core.get("default_panel") or await async_system_default_panel(self.hass)
                       or FALLBACK_DEFAULT_PANEL)
            target = first_allowed(eff) if landing in eff.hidden else None
        if target is not None and target != core.get("default_panel"):
            await data.async_set_core({**core, "default_panel": target})
            changed = True

        new_applied = {
            "hidden": list(eff.hidden),
            "default_panel": target if target is not None else applied.get("default_panel"),
            "order": eff.order is not None,
        }
        if new_applied != applied or user.id not in self.store.applied:
            self.store.applied[user.id] = new_applied
            self.store.schedule_save()
            changed = True
        return changed

    async def _async_release(self, user_id: str) -> bool:
        """Undo what the integration did to a user that is no longer managed."""
        if unsub := self._user_subs.pop(user_id, None):
            unsub()
        applied = self.store.applied.pop(user_id, None)
        snapshot = self.store.snapshots.pop(user_id, None)
        if applied is None:
            if snapshot is not None:
                self.store.schedule_save()
            return False
        data = await async_user_data(self.hass, user_id)
        await self._async_restore(data, applied, snapshot or {})
        self.store.schedule_save()
        return True

    @staticmethod
    async def _async_restore(data: Any, applied: dict, snapshot: dict) -> None:
        sidebar = data.sidebar
        original = snapshot.get("sidebar")
        if sidebar is not None:
            hidden = restore_hidden(sidebar.get("hiddenPanels") or [], applied.get("hidden", []),
                                    (original or {}).get("hiddenPanels"))
            seeded = snapshot.get("seeded_hidden") or []
            if original is None and not [p for p in hidden if p not in seeded] and (
                applied.get("order") or not sidebar.get("panelOrder")
            ):
                # The user never had a stored sidebar and didn't change anything on their own:
                # go back to Home Assistant's defaults.
                await data.async_set_sidebar(None)
            else:
                order = sidebar.get("panelOrder") or []
                if applied.get("order"):
                    order = (original or {}).get("panelOrder") or []
                await data.async_set_sidebar({**sidebar, "panelOrder": order, "hiddenPanels": hidden})
        core = data.core
        if applied.get("default_panel") and core.get("default_panel") == applied["default_panel"]:
            restored = {k: v for k, v in core.items() if k != "default_panel"}
            if snapshot.get("default_panel"):
                restored["default_panel"] = snapshot["default_panel"]
            await data.async_set_core(restored)

    async def async_restore_everyone(self) -> None:
        """Integration removed: give every user back their own sidebar."""
        async with self._lock:
            for user_id in list(self.store.applied):
                try:
                    await self._async_release(user_id)
                except Exception:  # noqa: BLE001
                    _LOGGER.exception("Could not restore the sidebar of user %s", user_id)
        await self.store.async_flush()

    # ------------------------------------------------------------------ live re-apply
    def _ensure_subscribed(self, user_id: str, data: Any) -> None:
        if user_id in self._user_subs:
            return

        @callback
        def _changed() -> None:
            # The user (or another tool) edited their sidebar / default dashboard: re-apply.
            # Our own writes land here too; the second pass finds nothing to change.
            self.hass.async_create_task(self.async_apply_user_id(user_id), eager_start=False)

        self._user_subs[user_id] = data.subscribe(_changed)
