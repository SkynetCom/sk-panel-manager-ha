"""The JS resolver used by the editor must give the same results as resolver.py."""
import dataclasses
import json
import pathlib
import shutil
import subprocess

import pytest

from conftest import model, resolver

JS = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "sk_panel_manager" / "frontend" / "skpm-resolver.js"

CATALOG = [
    resolver.PanelInfo("lovelace"),
    resolver.PanelInfo("kids", "Kids"),
    resolver.PanelInfo("energy", "Energy"),
    resolver.PanelInfo("hassio", "Add-ons", require_admin=True),
]
USERS = [
    resolver.UserInfo("u1", "Kid"),
    resolver.UserInfo("u2", "Guest"),
    resolver.UserInfo("a1", "Admin", is_admin=True),
    resolver.UserInfo("o1", "Owner", is_admin=True, is_owner=True),
]
CONFIGS = [
    {},
    {"settings": {"default_access": "deny"},
     "profiles": {"kids": {"panels": {"kids": "allow", "energy": "deny"}, "panel_order": ["energy", "kids"],
                           "default_panel": "energy"},
                  "power": {"panels": {"energy": "allow"}}},
     "users": {"u1": {"profiles": ["kids"]}, "u2": {"profiles": ["kids", "power"], "panels": {"ghost": "deny"}}}},
    {"settings": {"restrict_admins": True},
     "users": {"a1": {"panels": {"hassio": "deny", "lovelace": "deny"}, "default_panel": "lovelace"},
               "u2": {"managed": False}}},
]


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
@pytest.mark.parametrize("raw", CONFIGS)
def test_js_matches_python(raw, tmp_path):
    config = model.normalize_config(raw)
    expected = {u.id: resolver.resolve(config, u, CATALOG).as_dict() for u in USERS}
    script = tmp_path / "run.mjs"
    script.write_text(
        f"import {{ resolve }} from {json.dumps(JS.as_uri())};\n"
        f"const config = {json.dumps(config)};\n"
        f"const catalog = {json.dumps([dataclasses.asdict(p) for p in CATALOG])};\n"
        f"const users = {json.dumps([dataclasses.asdict(u) for u in USERS])};\n"
        "const out = {}; for (const u of users) out[u.id] = resolve(config, u, catalog);\n"
        "console.log(JSON.stringify(out));\n"
    )
    result = subprocess.run(["node", str(script)], capture_output=True, text=True, check=True)
    assert json.loads(result.stdout) == expected
