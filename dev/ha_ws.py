"""Send websocket commands to the local dev instance as one of the seeded users.

    .venv/bin/python dev/ha_ws.py '{"type": "get_panels"}'            # as the owner
    .venv/bin/python dev/ha_ws.py --user tomi '{"type": "sk_panel_manager/effective"}'
"""
from __future__ import annotations

import argparse
import asyncio
import json
import pathlib

import aiohttp

BASE = "http://127.0.0.1:8124"
CLIENT_ID = f"{BASE}/"
CREDS = pathlib.Path(__file__).resolve().parents[1] / ".ha-dev" / "dev-credentials.json"


async def token(http: aiohttp.ClientSession, user: str) -> str:
    creds = json.loads(CREDS.read_text())[user]
    flow = await (await http.post(f"{BASE}/auth/login_flow", json={
        "client_id": CLIENT_ID, "handler": ["homeassistant", None], "redirect_uri": CLIENT_ID})).json()
    result = await (await http.post(f"{BASE}/auth/login_flow/{flow['flow_id']}", json={
        "client_id": CLIENT_ID, **creds})).json()
    tok = await (await http.post(f"{BASE}/auth/token", data={
        "grant_type": "authorization_code", "code": result["result"], "client_id": CLIENT_ID})).json()
    return tok["access_token"]


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user", default="owner")
    parser.add_argument("commands", nargs="+", help="JSON websocket messages (without id)")
    args = parser.parse_args()
    async with aiohttp.ClientSession() as http, http.ws_connect(f"{BASE}/api/websocket") as ws:
        await ws.receive_json()
        await ws.send_json({"type": "auth", "access_token": await token(http, args.user)})
        await ws.receive_json()
        for i, raw in enumerate(args.commands, 1):
            await ws.send_json({"id": i, **json.loads(raw)})
            while True:
                msg = await ws.receive_json()
                if msg.get("id") == i:
                    print(json.dumps(msg, indent=2, ensure_ascii=False)[:6000])
                    break


asyncio.run(main())
