"""Integration tests inside a real Home Assistant core."""
import pytest
from datetime import timedelta

from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from homeassistant.components import frontend
from homeassistant.components.frontend import storage as fe_storage
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util

DOMAIN = "sk_panel_manager"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


async def _setup(hass: HomeAssistant):
    assert await async_setup_component(hass, "lovelace", {})
    entry = MockConfigEntry(domain=DOMAIN, data={"sidebar_title": "Paneles"}, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    for url, title in (("dashboard-kids", "Kids"), ("energy-dash", "Energy")):
        frontend.async_register_built_in_panel(hass, "lovelace", title, "mdi:home", frontend_url_path=url)
    await hass.async_block_till_done()
    return entry, hass.data[DOMAIN]["enforcer"]


async def _kid(hass: HomeAssistant):
    # The first user created becomes the owner, who is never managed.
    if not any(u.is_owner for u in await hass.auth.async_get_users()):
        await hass.auth.async_create_user("Owner", group_ids=["system-admin"])
    return await hass.auth.async_create_user("Kid", group_ids=["system-users"])


async def _store(hass, user_id):
    return await fe_storage.async_user_store(hass, user_id)


async def _save(hass, enforcer, config):
    from custom_components.sk_panel_manager.model import validate_config

    await enforcer.store.async_save_config(validate_config(config))
    await enforcer.async_apply_all()
    await hass.async_block_till_done()


async def test_panel_registered_admin_only(hass: HomeAssistant):
    await _setup(hass)
    panel = hass.data[frontend.DATA_PANELS]["sk-panels"]
    assert panel.require_admin is True
    assert panel.sidebar_title == "Paneles"


async def test_hides_panels_and_reapplies_when_user_edits(hass: HomeAssistant):
    kid = await _kid(hass)
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {"users": {kid.id: {"panels": {"energy-dash": "deny"}}}})

    store = await _store(hass, kid.id)
    assert store.data["sidebar"]["hiddenPanels"] == ["energy-dash"]

    # The kid un-hides energy and hides the kids dashboard from their profile.
    await store.async_set_item("sidebar", {"panelOrder": [], "hiddenPanels": ["dashboard-kids"]})
    await hass.async_block_till_done()
    assert store.data["sidebar"]["hiddenPanels"] == ["dashboard-kids", "energy-dash"]

    # Allowed again: energy comes back, the user's own choice stays.
    await _save(hass, enforcer, {"users": {kid.id: {"panels": {}}}})
    assert store.data["sidebar"]["hiddenPanels"] == ["dashboard-kids"]


async def test_default_panel_moves_off_hidden_dashboard(hass: HomeAssistant):
    kid = await _kid(hass)
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {
        "settings": {"default_access": "deny"},
        "users": {kid.id: {"panels": {"dashboard-kids": "allow"}}},
    })
    store = await _store(hass, kid.id)
    assert store.data["core"]["default_panel"] == "dashboard-kids"
    assert "lovelace" in store.data["sidebar"]["hiddenPanels"]

    # Choosing a hidden dashboard as default from the profile is undone.
    await store.async_set_item("core", {"default_panel": "lovelace"})
    await hass.async_block_till_done()
    assert store.data["core"]["default_panel"] == "dashboard-kids"


async def test_admins_untouched_unless_restricted(hass: HomeAssistant, hass_admin_user):
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {"settings": {"default_access": "deny"}})
    store = await _store(hass, hass_admin_user.id)
    assert "sidebar" not in store.data


async def test_release_and_remove_restore_original_sidebar(hass: HomeAssistant):
    kid = await _kid(hass)
    store = await _store(hass, kid.id)
    await store.async_set_item("sidebar", {"panelOrder": ["energy-dash"], "hiddenPanels": ["map"]})
    await store.async_set_item("core", {"default_panel": "energy-dash"})
    entry, enforcer = await _setup(hass)

    await _save(hass, enforcer, {"users": {kid.id: {"panels": {"energy-dash": "deny"}}}})
    assert store.data["sidebar"]["hiddenPanels"] == ["map", "energy-dash"]
    assert store.data["core"]["default_panel"] != "energy-dash"

    # Excluding the user gives back exactly what they had.
    await _save(hass, enforcer, {"users": {kid.id: {"managed": False, "panels": {"energy-dash": "deny"}}}})
    assert store.data["sidebar"] == {"panelOrder": ["energy-dash"], "hiddenPanels": ["map"]}
    assert store.data["core"] == {"default_panel": "energy-dash"}

    # Managed again, then the integration is deleted: same result.
    await _save(hass, enforcer, {"users": {kid.id: {"panels": {"energy-dash": "deny"}}}})
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert store.data["sidebar"] == {"panelOrder": ["energy-dash"], "hiddenPanels": ["map"]}
    assert store.data["core"] == {"default_panel": "energy-dash"}


async def test_release_user_without_stored_sidebar_goes_back_to_defaults(hass: HomeAssistant):
    kid = await _kid(hass)
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {"profiles": {"kids": {"panel_order": ["dashboard-kids"]}},
                                 "users": {kid.id: {"profiles": ["kids"], "panels": {"energy-dash": "deny"}}}})
    store = await _store(hass, kid.id)
    assert store.data["sidebar"]["panelOrder"] == ["dashboard-kids"]
    await _save(hass, enforcer, {"users": {kid.id: {"managed": False}}})
    assert store.data["sidebar"] is None
    assert enforcer.store.applied == {} and enforcer.store.snapshots == {}


async def test_explicit_allow_shows_panel_hidden_by_default(hass: HomeAssistant):
    kid = await _kid(hass)
    _, enforcer = await _setup(hass)
    frontend.async_register_built_in_panel(hass, "lovelace", "Lights", "mdi:lamps", frontend_url_path="lights-x",
                                           sidebar_default_visible=False)
    await _save(hass, enforcer, {})
    store = await _store(hass, kid.id)
    assert "lights-x" not in (store.data.get("sidebar") or {}).get("panelOrder", [])  # HA keeps it hidden
    await _save(hass, enforcer, {"users": {kid.id: {"panels": {"lights-x": "allow"}}}})
    assert "lights-x" in store.data["sidebar"]["panelOrder"]  # shown
    await _save(hass, enforcer, {"users": {kid.id: {"panels": {}}}})
    assert "lights-x" not in store.data["sidebar"]["panelOrder"]  # back to HA's default
    await _save(hass, enforcer, {"users": {kid.id: {"managed": False}}})
    assert store.data["sidebar"] is None


async def test_new_panel_follows_default_access(hass: HomeAssistant):
    kid = await _kid(hass)
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {"settings": {"default_access": "deny"}})
    frontend.async_register_built_in_panel(hass, "lovelace", "New", "mdi:new-box", frontend_url_path="new-dash")
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=2))  # debounce cooldown
    await hass.async_block_till_done()
    store = await _store(hass, kid.id)
    assert "new-dash" in store.data["sidebar"]["hiddenPanels"]


async def test_websocket_permissions(hass: HomeAssistant, hass_ws_client, hass_admin_user,
                                     hass_read_only_user, hass_read_only_access_token):
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {"users": {hass_read_only_user.id: {"panels": {"energy-dash": "deny"}}}})

    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": f"{DOMAIN}/config"})
    msg = await admin.receive_json()
    assert msg["success"]
    assert any(p["url_path"] == "dashboard-kids" for p in msg["result"]["catalog"])
    assert msg["result"]["effective"][hass_read_only_user.id]["hidden"] == ["energy-dash"]

    await admin.send_json_auto_id({"type": f"{DOMAIN}/config/save", "config": {"users": {"x": {"profiles": ["nope"]}}}})
    msg = await admin.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "invalid_config"

    user = await hass_ws_client(hass, hass_read_only_access_token)
    for command in ({"type": f"{DOMAIN}/config"},
                    {"type": f"{DOMAIN}/config/save", "config": {}},
                    {"type": f"{DOMAIN}/effective", "user_id": hass_admin_user.id}):
        await user.send_json_auto_id(command)
        msg = await user.receive_json()
        assert not msg["success"] and msg["error"]["code"] == "unauthorized", command

    await user.send_json_auto_id({"type": f"{DOMAIN}/effective"})
    msg = await user.receive_json()
    assert msg["success"]
    assert msg["result"]["hidden"] == ["energy-dash"]
    assert set(msg["result"]["settings"]) == {"lock_sidebar_editing", "redirect_forbidden"}
    assert "profiles" not in msg["result"] and "users" not in msg["result"]

    # Live updates when an admin changes the rules.
    await user.send_json_auto_id({"type": f"{DOMAIN}/subscribe"})
    assert (await user.receive_json())["success"]
    assert (await user.receive_json())["event"]["hidden"] == ["energy-dash"]
    await admin.send_json_auto_id({"type": f"{DOMAIN}/config/save", "config": {}})
    assert (await admin.receive_json())["success"]
    event = await user.receive_json()
    while event["event"]["hidden"]:  # a first event may still carry the old rules
        event = await user.receive_json()
    assert event["event"]["hidden"] == []


async def test_runtime_module_loaded_and_released_on_unload(hass: HomeAssistant, hass_ws_client,
                                                            hass_read_only_user, hass_read_only_access_token):
    from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL

    entry, enforcer = await _setup(hass)
    assert any("skpm-runtime.js" in url for url in hass.data[DATA_EXTRA_MODULE_URL].urls)
    await _save(hass, enforcer, {"users": {hass_read_only_user.id: {"panels": {"energy-dash": "deny"}}}})

    user = await hass_ws_client(hass, hass_read_only_access_token)
    await user.send_json_auto_id({"type": f"{DOMAIN}/subscribe"})
    assert (await user.receive_json())["success"]
    assert (await user.receive_json())["event"]["managed"] is True

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert not any("skpm-runtime.js" in url for url in hass.data[DATA_EXTRA_MODULE_URL].urls)
    event = await user.receive_json()
    assert event["event"] == {"managed": False, "reason": "not_loaded"}


async def test_devices_and_kiosk_over_websocket(hass: HomeAssistant, hass_ws_client, hass_read_only_user,
                                                 hass_read_only_access_token):
    _, enforcer = await _setup(hass)
    await _save(hass, enforcer, {
        "kiosk": {"all": {"hide_search": True}},
        "users": {hass_read_only_user.id: {"kiosk": {"all": {"hide_header": True}}}},
    })
    user = await hass_ws_client(hass, hass_read_only_access_token)
    await user.send_json_auto_id({"type": f"{DOMAIN}/subscribe", "device_id": "dev_tab1", "user_agent": "Test/1.0"})
    assert (await user.receive_json())["success"]
    event = (await user.receive_json())["event"]
    assert event["kiosk"]["default"] == {"hide_search": True, "hide_header": True}
    assert event["is_admin"] is False
    assert enforcer.store.device_status["dev_tab1"]["last_user"] == hass_read_only_user.id

    # The admin gives the device its own kiosk: the user's browser gets it live.
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": f"{DOMAIN}/config"})
    payload = (await admin.receive_json())["result"]
    assert "dev_tab1" in payload["device_status"]
    config = payload["config"]
    config["devices"] = {"dev_tab1": {"name": "Kitchen", "kiosk": {"all": {"kiosk": True}}}}
    await admin.send_json_auto_id({"type": f"{DOMAIN}/config/save", "config": config})
    assert (await admin.receive_json())["success"]
    event = (await user.receive_json())["event"]
    while not event["kiosk"]["default"].get("kiosk"):
        event = (await user.receive_json())["event"]
    assert event["kiosk"]["default"] == {"hide_search": True, "hide_header": True, "kiosk": True}

    # Only admins can forget a device; forgetting drops its settings.
    await user.send_json_auto_id({"type": f"{DOMAIN}/device/forget", "device_id": "dev_tab1"})
    assert (await _result(user))["error"]["code"] == "unauthorized"
    await admin.send_json_auto_id({"type": f"{DOMAIN}/device/forget", "device_id": "dev_tab1"})
    result = (await admin.receive_json())["result"]
    assert "dev_tab1" not in result["device_status"] and "dev_tab1" not in result["config"]["devices"]

    await user.send_json_auto_id({"type": f"{DOMAIN}/subscribe", "device_id": "bad id!"})
    assert (await _result(user))["error"]["code"] == "invalid_format"


async def _result(ws):
    """Next command result, skipping live events of earlier subscriptions."""
    while (msg := await ws.receive_json())["type"] != "result":
        pass
    return msg


async def test_untouched_without_rules_and_diagnostics(hass: HomeAssistant):
    kid = await _kid(hass)
    entry, enforcer = await _setup(hass)
    await _save(hass, enforcer, {})
    store = await _store(hass, kid.id)
    assert "sidebar" not in store.data  # nothing to enforce: no write

    from custom_components.sk_panel_manager.diagnostics import async_get_config_entry_diagnostics

    await _save(hass, enforcer, {"profiles": {"kids": {"name": "Kids of the Smiths"}},
                                 "users": {kid.id: {"profiles": ["kids"], "panels": {"energy-dash": "deny"}}}})
    diag = await async_get_config_entry_diagnostics(hass, entry)
    text = str(diag)
    assert kid.id not in text and "Kid" not in text and "Smiths" not in text
    assert any(e["hidden"] == ["energy-dash"] for e in diag["effective"].values())
