"""Backup and Kiosk Mode importer (frontend/skpm-import.js), run with node."""
import json
import pathlib
import shutil
import subprocess

import pytest

JS = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "sk_panel_manager" / "frontend" / "skpm-import.js"
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

USERS = [
    {"id": "u1", "name": "Tomás", "is_admin": False, "system_generated": False},
    {"id": "u2", "name": "Kitchen Tablet", "is_admin": False, "system_generated": False},
]


def run(tmp_path, body: str):
    script = tmp_path / "run.mjs"
    script.write_text(f"import * as m from {json.dumps(JS.as_uri())};\nconst USERS = {json.dumps(USERS)};\n"
                      f"const out = (() => {{ {body} }})();\nconsole.log(JSON.stringify(out));\n")
    result = subprocess.run(["node", str(script)], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def test_convert_kiosk_mode(tmp_path):
    dashboards = [
        {"url_path": "lovelace", "kiosk_mode": {
            "hide_header": True, "block_overflow": True, "hide_unused_entities": True, "debug": True,
            "hide_search": "[[[ return user_name == 'x' ]]]",
            "non_admin_settings": {"hide_sidebar": True},
            "admin_settings": {"hide_header": False},
            "user_settings": [{"users": ["tomás", "Ghost"], "kiosk": True, "hide_dialog_header_action_items": True},
                              {"users": "kitchen tablet", "block_mouse": True}],
            "mobile_settings": {"hide_header": True, "custom_width": 812},
        }},
    ]
    out = run(tmp_path, f"return m.convertKioskMode({json.dumps(dashboards)}, USERS);")
    assert out["general"] == {"lovelace": {"hide_header": True, "hide_overflow": True, "hide_sidebar": True}}
    assert out["users"] == {
        "u1": {"lovelace": {"kiosk": True, "hide_dialog_settings": True, "hide_dialog_overflow": True}},
        "u2": {"lovelace": {"block_mouse": True}},
    }
    assert out["unmatched"] == ["Ghost"]
    reasons = {(s["key"], s["reason"]) for s in out["skipped"]}
    assert reasons == {("hide_unused_entities", "unsupported"), ("hide_search", "template"),
                       ("admin_settings", "admins"), ("mobile_settings", "mobile")}


def test_apply_kiosk_import_merges(tmp_path):
    out = run(tmp_path, """
      const config = { kiosk: { all: { hide_search: true }, dashboards: { lovelace: { hide_header: false, hide_assistant: true } } },
                       users: {} };
      const conv = { general: { lovelace: { hide_header: true } }, users: { u1: { kids: { kiosk: true } } } };
      m.applyKioskImport(config, conv, (id) => (config.users[id] = config.users[id] || { profiles: [], panels: {}, kiosk: null }));
      return config;""")
    assert out["kiosk"] == {"all": {"hide_search": True},
                            "dashboards": {"lovelace": {"hide_header": True, "hide_assistant": True}}}
    assert out["users"]["u1"]["kiosk"] == {"all": {}, "dashboards": {"kids": {"kiosk": True}}}


def test_backup_round_trip_remaps_users_by_name(tmp_path):
    out = run(tmp_path, """
      const config = { settings: {}, profiles: {}, devices: {}, kiosk: null,
                       users: { u1: { profiles: [] }, old9: { profiles: ["p"] }, gone: { profiles: [] } } };
      const backup = m.makeBackup(config, [...USERS, { id: "old9", name: "kitchen tablet" }, { id: "gone", name: "Nobody" }], "0.5.0");
      const read = m.readBackup(JSON.parse(JSON.stringify(backup)), USERS);
      let error = null;
      try { m.readBackup({ hello: 1 }, USERS); } catch (e) { error = e.message; }
      return { format: backup.format, users: Object.keys(read.config.users).sort(), report: read.report, error };""")
    assert out["format"] == "sk_panel_manager"
    assert out["users"] == ["u1", "u2"]  # old9 found by name ("kitchen tablet")
    assert out["report"] == {"kept": 1, "matched": ["kitchen tablet"], "dropped": ["Nobody"]}
    assert out["error"] == "not_a_backup"
