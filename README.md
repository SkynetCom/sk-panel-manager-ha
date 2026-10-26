<p align="center">
  <img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/custom_components/sk_panel_manager/brand/logo@2x.png" alt="SK Panel Manager" width="420">
</p>

# SK Panel Manager for Home Assistant

🇬🇧 English · 🇪🇸 [Español](README.es.md)

Choose which panels and dashboards each Home Assistant user sees, from one admin-only panel.

> **Status: in development (0.1.0).** The rules engine works; the full graphical admin panel and the kiosk editor are coming next.

## How it works
- Rules per **user** and per **profile** (for example *Kids*, *Guests*, *Tablet*). With several profiles, permissions add up; a rule set on the user always wins.
- The integration writes each user's sidebar and default dashboard to **Home Assistant's own per-user storage** (the same place the profile's *Edit sidebar* uses), and puts them back if the user changes them.
- The **owner is never restricted**. Administrators are only restricted when you turn that on.
- Removing the integration gives every user back the sidebar they had before.

## What it protects and what it doesn't
- ✅ Hides panels from each user's sidebar and keeps them hidden.
- ✅ Sets each user's default dashboard.
- ❌ **It is not access control.** A user with technical knowledge can still read any dashboard's configuration and the state of entities through Home Assistant's API. For sensitive data, use admin-only dashboards or separate users.

## Requirements
Home Assistant **2026.1** or newer.

## License
MIT
