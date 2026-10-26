# Changelog

🇬🇧 English · 🇪🇸 [Español](CHANGELOG.es.md)

## 0.2.0 — 2026-10-26
- **Admin panel:** overview (per-user cards, alerts), **access matrix** (users and profiles × panels, click to cycle
  inherit / show / hide), **users** (profiles, per-panel rules, default dashboard, drag & drop order, live sidebar preview),
  **profiles** (name, icon, color, members, rules, order) and **settings**. English and Spanish, light and dark themes, phone layout.
- Panels Home Assistant hides by default (Lights, Climate, Security…) stay hidden unless a rule explicitly shows them.
- Panel catalog grouped by kind: dashboards, Home Assistant, integrations, add-ons.

## 0.1.0 — 2026-10-26
- Rules engine: per-user and per-profile rules, default access, sidebar and default dashboard written to Home Assistant's
  per-user storage and re-applied when the user changes them, restore on release or removal, admin-only websocket API.
