"""Rules resolution and configuration model, without Home Assistant."""
import pytest

from conftest import model, resolver

P = resolver.PanelInfo
U = resolver.UserInfo

CATALOG = [
    P("lovelace"),
    P("dashboard-kids", "Kids"),
    P("energy", "Energy"),
    P("map", "Map", default_visible=False),
    P("hassio", "Add-ons", require_admin=True),
]
KID = U("kid", "Kid")


def cfg(**data):
    return model.normalize_config(data)


def test_everything_allowed_by_default():
    eff = resolver.resolve(cfg(), KID, CATALOG)
    assert eff.managed
    assert eff.allowed == ["lovelace", "dashboard-kids", "energy", "map"]  # admin-only panel left out
    assert eff.hidden == []
    assert eff.order is None and eff.default_panel is None


def test_default_deny_and_profiles_add_up():
    config = cfg(
        settings={"default_access": "deny"},
        profiles={
            "kids": {"name": "Kids", "panels": {"dashboard-kids": "allow", "energy": "deny"}},
            "energy": {"name": "Energy", "panels": {"energy": "allow"}},
        },
        users={"kid": {"profiles": ["kids", "energy"]}},
    )
    eff = resolver.resolve(config, KID, CATALOG)
    assert eff.allowed == ["dashboard-kids", "energy"]  # one profile allowing energy is enough
    assert set(eff.hidden) == {"lovelace", "map"}
    assert eff.sources["energy"] == "profile:energy"
    assert eff.sources["lovelace"] == "default"


def test_user_override_wins_over_profiles():
    config = cfg(
        profiles={"kids": {"panels": {"energy": "allow"}}},
        users={"kid": {"profiles": ["kids"], "panels": {"energy": "deny"}}},
    )
    eff = resolver.resolve(config, KID, CATALOG)
    assert "energy" in eff.hidden and eff.sources["energy"] == "user"


def test_unregistered_denied_panel_stays_hidden():
    config = cfg(users={"kid": {"panels": {"not-yet-loaded": "deny"}}})
    eff = resolver.resolve(config, KID, CATALOG)
    assert "not-yet-loaded" in eff.hidden


def test_owner_admin_system_and_excluded_are_not_managed():
    config = cfg(users={"kid": {"managed": False}})
    assert resolver.resolve(config, KID, CATALOG).reason == "excluded"
    assert resolver.resolve(cfg(), U("o", is_owner=True, is_admin=True), CATALOG).reason == "owner"
    assert resolver.resolve(cfg(), U("a", is_admin=True), CATALOG).reason == "admin"
    assert resolver.resolve(cfg(), U("s", system_generated=True), CATALOG).reason == "system"
    restricted = cfg(settings={"restrict_admins": True})
    assert resolver.resolve(restricted, U("a", is_admin=True), CATALOG).managed
    # the owner stays free even with restrict_admins
    assert not resolver.resolve(restricted, U("o", is_owner=True, is_admin=True), CATALOG).managed


def test_order_and_default_panel_follow_allowed():
    config = cfg(
        profiles={"kids": {"panel_order": ["energy", "dashboard-kids"], "default_panel": "energy"}},
        users={"kid": {"profiles": ["kids"], "panels": {"energy": "deny"}}},
    )
    eff = resolver.resolve(config, KID, CATALOG)
    assert eff.order == ["dashboard-kids"]
    assert eff.default_panel == "dashboard-kids"  # configured default is hidden: first allowed


def test_merge_hidden_keeps_users_own_choices():
    # user hid "map" themselves; we used to hide "energy", now we hide "lovelace"
    assert resolver.merge_hidden(["map", "energy"], ["energy"], ["lovelace"]) == ["map", "lovelace"]
    # user removed a hidden panel in their profile: it comes back
    assert resolver.merge_hidden([], ["energy"], ["energy"]) == ["energy"]


def test_restore_hidden():
    # we hid energy; map was hidden by the user; energy was already hidden before us
    assert resolver.restore_hidden(["map", "energy", "kids"], ["energy", "kids"], ["energy"]) == ["map", "energy"]


def test_normalize_drops_invalid_data():
    config = cfg(
        settings={"default_access": "maybe", "lock_sidebar_editing": "yes"},
        profiles={"bad id!": {}, "ok": {"color": "red", "icon": "x", "panels": {"a": "allow", "b": "nope"},
                                         "kiosk": {"all": {"hide_header": True, "unknown": True}}}},
        users={"u1": {"profiles": ["ok", "missing", "ok"], "managed": False}},
    )
    assert config["settings"] == model.DEFAULT_SETTINGS
    assert list(config["profiles"]) == ["ok"]
    profile = config["profiles"]["ok"]
    assert profile["color"] is None and profile["icon"] == "mdi:account-group"
    assert profile["panels"] == {"a": "allow"}
    assert profile["kiosk"] == {"all": {"hide_header": True}, "dashboards": {}}
    assert config["users"]["u1"]["profiles"] == ["ok"]
    assert config["users"]["u1"]["managed"] is False


@pytest.mark.parametrize("data", [
    [],
    {"profiles": []},
    {"users": {"bad id!": {}}},
    {"users": {"u1": {"panels": {"x": "maybe"}}}},
    {"users": {"u1": {"profiles": ["ghost"]}}},
    {"users": {"u1": {"profiles": "kids"}}},
])
def test_validate_rejects(data):
    with pytest.raises(model.InvalidConfig):
        model.validate_config(data)


def test_kiosk_layers_and_dashboard_overrides():
    config = cfg(
        kiosk={"all": {"hide_search": True}},
        profiles={
            "kids": {"kiosk": {"all": {"hide_header": True}, "dashboards": {"energy": {"hide_header": False}}}},
            "wall": {"kiosk": {"all": {"block_more_info": True}}},
        },
        users={"kid": {"profiles": ["kids", "wall"], "kiosk": {"all": {"hide_search": False}}}},
        devices={"tab1": {"name": "Kitchen", "kiosk": {"all": {"kiosk": True}, "dashboards": {"energy": {"kiosk": False}}}}},
    )
    k = resolver.resolve_kiosk(config, KID, None)
    assert k["default"] == {"hide_header": True, "block_more_info": True}  # user turned search back on
    assert k["dashboards"] == {"energy": {"block_more_info": True}}       # profile override on energy
    k = resolver.resolve_kiosk(config, KID, "tab1")
    assert k["default"] == {"hide_header": True, "block_more_info": True, "kiosk": True}
    assert k["dashboards"]["energy"] == {"block_more_info": True}         # device override on energy


def test_kiosk_device_layer_applies_to_unmanaged_users():
    config = cfg(kiosk={"all": {"hide_header": True}}, devices={"tab1": {"kiosk": {"all": {"kiosk": True}}}})
    owner = U("o", is_owner=True, is_admin=True)
    assert resolver.resolve_kiosk(config, owner, None)["default"] == {}
    assert resolver.resolve_kiosk(config, owner, "tab1")["default"] == {"kiosk": True}


def test_versions_match():
    import json
    import pathlib
    import re

    base = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "sk_panel_manager"
    manifest = json.loads((base / "manifest.json").read_text())["version"]
    const = re.search(r'^VERSION = "([^"]+)"', (base / "const.py").read_text(), re.M).group(1)
    panel = re.search(r'PANEL_VERSION = "([^"]+)"', (base / "frontend" / "skpm-panel.js").read_text()).group(1)
    assert manifest == const == panel


@pytest.mark.parametrize("data", [
    {"profiles": {"p": {"panels": ["x"]}}},
    {"users": {"u": {"profiles": [{"a": 1}]}}},
    {"users": {"u": "nope"}},
    {"profiles": {f"p{i}": {} for i in range(101)}},
])
def test_validate_rejects_bad_types_cleanly(data):
    with pytest.raises(model.InvalidConfig):
        model.validate_config(data)


def test_icon_must_be_mdi_name():
    config = model.normalize_config({"profiles": {"p": {"icon": 'mdi:x" onmouseover="alert(1)'}}})
    assert config["profiles"]["p"]["icon"] == "mdi:account-group"
