"""Seed a local Home Assistant dev instance (.ha-dev) for manual testing.

    .venv/bin/hass -c .ha-dev --skip-pip          # in one terminal
    .venv/bin/python dev/ha_seed.py               # once HA answers on :8124

Creates the owner and test users with random passwords (written to .ha-dev/dev-credentials.json,
which is git-ignored), a few dashboards, and adds SK Panel Manager.
"""
from __future__ import annotations

import asyncio
import json
import pathlib
import secrets

import aiohttp

BASE = "http://127.0.0.1:8124"
CLIENT_ID = f"{BASE}/"
ROOT = pathlib.Path(__file__).resolve().parents[1] / ".ha-dev"
CREDS = ROOT / "dev-credentials.json"

USERS = [  # username, name, admin
    ("ana", "Ana (admin)", True),
    ("tomi", "Tomás", False),
    ("sofi", "Sofía", False),
    ("tablet", "Tablet cocina", False),
]
DASHBOARDS = [("dashboard-ninos", "Chicos", "mdi:teddy-bear"), ("dashboard-tablet", "Tablet cocina", "mdi:tablet"),
              ("dashboard-camaras", "Cámaras", "mdi:cctv")]


async def main() -> None:
    creds = json.loads(CREDS.read_text()) if CREDS.exists() else {}
    async with aiohttp.ClientSession() as http:
        status = await (await http.get(f"{BASE}/api/onboarding")).json()
        if not next(s for s in status if s["step"] == "user")["done"]:
            creds["owner"] = {"username": "owner", "password": secrets.token_urlsafe(12)}
            resp = await http.post(f"{BASE}/api/onboarding/users", json={
                "client_id": CLIENT_ID, "name": "Owner", "username": "owner",
                "password": creds["owner"]["password"], "language": "es"})
            code = (await resp.json())["auth_code"]
        else:
            resp = await http.post(f"{BASE}/auth/login_flow", json={
                "client_id": CLIENT_ID, "handler": ["homeassistant", None], "redirect_uri": CLIENT_ID})
            flow = await resp.json()
            resp = await http.post(f"{BASE}/auth/login_flow/{flow['flow_id']}", json={
                "client_id": CLIENT_ID, **creds["owner"]})
            code = (await resp.json())["result"]
        token = (await (await http.post(f"{BASE}/auth/token", data={
            "grant_type": "authorization_code", "code": code, "client_id": CLIENT_ID})).json())["access_token"]
        auth = {"Authorization": f"Bearer {token}"}
        for step in ("core_config", "analytics", "integration"):
            body = {"client_id": CLIENT_ID, "redirect_uri": CLIENT_ID} if step == "integration" else {}
            await http.post(f"{BASE}/api/onboarding/{step}", json=body, headers=auth)

        async with http.ws_connect(f"{BASE}/api/websocket") as ws:
            await ws.receive_json()
            await ws.send_json({"type": "auth", "access_token": token})
            await ws.receive_json()
            msg_id = 0

            async def call(payload: dict) -> dict:
                nonlocal msg_id
                msg_id += 1
                await ws.send_json({"id": msg_id, **payload})
                while True:
                    msg = await ws.receive_json()
                    if msg.get("id") == msg_id and msg.get("type") == "result":
                        return msg

            existing = {u["name"] for u in (await call({"type": "config/auth/list"}))["result"]}
            for username, name, admin in USERS:
                if name in existing:
                    continue
                user = (await call({"type": "config/auth/create", "name": name,
                                    "group_ids": ["system-admin" if admin else "system-users"],
                                    "local_only": False}))["result"]["user"]
                creds[username] = {"username": username, "password": secrets.token_urlsafe(12)}
                await call({"type": "config/auth_provider/homeassistant/create", "user_id": user["id"],
                            "username": username, "password": creds[username]["password"]})
            dashboards = {d["url_path"] for d in (await call({"type": "lovelace/dashboards/list"}))["result"]}
            for url, title, icon in DASHBOARDS:
                if url not in dashboards:
                    await call({"type": "lovelace/dashboards/create", "url_path": url, "title": title,
                                "icon": icon, "show_in_sidebar": True, "require_admin": False, "mode": "storage"})

        entries = await (await http.get(f"{BASE}/api/config/config_entries/entry?domain=sk_panel_manager", headers=auth)).json()
        if not entries:
            flow = await (await http.post(f"{BASE}/api/config/config_entries/flow", json={
                "handler": "sk_panel_manager"}, headers=auth)).json()
            await http.post(f"{BASE}/api/config/config_entries/flow/{flow['flow_id']}",
                            json={"sidebar_title": "Paneles"}, headers=auth)
    CREDS.write_text(json.dumps(creds, indent=2))
    print(f"Seeded. Credentials in {CREDS.relative_to(ROOT.parent)} (git-ignored).")


asyncio.run(main())
