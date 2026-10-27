# Changelog

🇬🇧 English · 🇪🇸 [Español](CHANGELOG.es.md)

## 1.0.4 — 2026-10-27
- **Fixed for Home Assistant 2026.10:** the sidebar was rebuilt in 2026.10 and some kiosk options stopped working there.
  - *Hide sidebar* left an empty white strip where the sidebar used to be. The dashboard and its header now use the whole
    width again (as with *Full kiosk*).
  - *Hide Settings*, *Hide Notifications* and *Hide profile* didn't hide those sidebar items.
  - Both work on older versions as before.
- **Hide sidebar also hides the ☰ button on phones:** without a sidebar the button only opened an empty menu. The kiosk
  preview shows it as hidden too.

## 1.0.3 — 2026-10-27
- **Styled drop-downs everywhere:** the browser's own select menus are replaced by the panel's drop-down (icons, user
  avatars, a check on the current choice, keyboard arrows, Escape and click outside to close) in *View as…* and in the
  kiosk tab's *Setting for one dashboard*.
- Fixed: the "older version of this panel" notice (and other notices above a page) touched the cards below it; it has its
  spacing back. Notices inside cards keep their tighter layout.

## 1.0.2 — 2026-10-27
- **Default dashboard with one tap:** the drop-down is gone. In the *Order and default* card of users and profiles, tap the
  house next to a dashboard to make it the one the user starts on; tap it again to go back to the inherited one. A faded
  house shows a default inherited from a profile, and a line above the list says where the user starts.
- **Icon picker for profiles:** a button opens a searchable grid with Home Assistant's own icon list (about 7,000 icons,
  searched by name and keywords, best matches first) and suggested icons before you type. No more typing `mdi:` names.
- **Fixed:** in the profile editor, the order list and its controls could overflow their card on some screen widths.
  The order column is wider and nothing in a column can push it wider any more.

## 1.0.1 — 2026-10-27
- **Adding the integration can't get stuck anymore:** setup no longer waits until the rules are applied to every user (that
  now happens right after, in the background). A slow or unusual installation could leave the *Add integration* dialog
  spinning and the integration "already being set up".
- **Security hardening** (from a full review before submitting to the HACS store):
  - Importing a backup keeps only well-formed values, and every colour shown in the panel is validated, so a crafted file
    can't run code in the admin's browser.
  - After the integration is unloaded or removed, nothing can re-apply old rules; uninstalling keeps the data if a user's
    sidebar couldn't be restored, instead of losing it.
  - Reloading the integration (for example after changing its title) sends the rules again, so wall tablets stay in kiosk.
  - A non-admin user can register at most 5 browsers and can't fill the device list; a browser that opens Home Assistant
    again doesn't cause a write every time.
  - Stricter validation of saved configurations (types, limits, icon names) with clear errors.
  - The browser module ignores malformed addresses, never lets an error reach Home Assistant's connection, and does no work
    for users without kiosk options. Non-admin users no longer receive internal profile ids.
  - Diagnostics map every profile id to an alias.
- Setup dialog: a short description for the title field; a second attempt is refused cleanly by Home Assistant
  (single instance). Changing the options reloads the integration with Home Assistant's own mechanism.
- Tests run on both an older and the current Home Assistant (Python 3.13 and 3.14), every week too; new tests for the
  setup dialog and every fix above.
- README: compatibility note (it uses Home Assistant's per-user frontend storage, which is not a public API), kiosk mode is
  not a security boundary either, softer wording, and images about 4x smaller.

## 1.0.0 — 2026-10-27
First stable release.
- **Diagnostics:** *Settings → Devices & services → SK Panel Manager → ⋮ → Download diagnostics* now includes the rules and
  their effect, with user names, ids and device names left out. Attach it when you report a problem.
- Previews (Users, View as…) show that Home Assistant only lists the main dashboard (*Overview*) while it's the user's
  default dashboard, exactly like the real sidebar; *View as…* redirects with the same rule as the browser module.
- Checked end to end in a real Home Assistant signed in as a non-admin user: hidden panels, default dashboard, redirection,
  locked sidebar editing (the profile's *Edit* button), changes made through the API put back, kiosk options, and no access
  to the admin panel or its commands.
- A user with no stored sidebar and no rule to enforce is no longer written to: installing the integration doesn't touch
  anyone's sidebar until a rule needs it.

## 0.5.0 — 2026-10-27
- **View as…** (new tab): pick a user, a device and a dashboard and see their sidebar, the kiosk mock and where a hidden
  dashboard sends them, plus a **Why** table with the rule or layer behind every panel and kiosk option.
- **Import from Kiosk Mode** (Settings): reads the `kiosk_mode:` block of every dashboard and turns top-level,
  `non_admin_settings` and `user_settings` options into kiosk settings (users matched by name). It lists what can't be
  imported and why (`admin_settings`, `mobile_settings`, templates, options with no equivalent). Nothing is saved until you press Save.
- **Backup** (Settings): export the configuration to a JSON file and import it here or into another Home Assistant;
  users are matched by id, then by name, and the import lands as unsaved changes with a report.

## 0.4.0 — 2026-10-27
- **Kiosk mode editor** (new *Kiosk* tab): full kiosk, hide header, sidebar and menu button; hide search, Assist, edit and ⋮
  in the header; hide Settings, Notifications and Profile in the sidebar; block entity dialogs or hide their ⚙ and ⋮;
  block the context menu or all touch/mouse input.
- **Layers:** general → profiles → user → device, each with *Inherit / On / Off* and its own overrides for single dashboards.
  A live mock of Home Assistant shows what each layer hides.
- **Devices:** every browser or app that opens Home Assistant is listed with its last user; name it and give it its own kiosk.
  Device settings apply to whoever uses it. Admins can turn the kiosk off in one tab with `?skpm_disable`.
- Full kiosk uses Home Assistant's own kiosk mode; the other options use Home Assistant events or a small stylesheet, with
  every selector in one place and checked against a real Home Assistant 2026.2.
- Avatars use letters only for their initials ("Ana (admin)" → "AA").

## 0.3.0 — 2026-10-26
- **Browser module**, loaded automatically on every page. For managed users only:
  - **Lock sidebar editing:** the profile's *Edit* button and the sidebar long-press show a notice instead of the editor.
  - **Redirect hidden panels:** opening a hidden panel by its address (link, bookmark, back button) goes to the
    user's default dashboard, with a notice.
  - Rules arrive live: changes saved by an admin apply without reloading the browser.
- It uses Home Assistant's own events (dialogs, navigation), not its page structure, so frontend updates don't break it.

## 0.2.0 — 2026-10-26
- **Admin panel:** overview (per-user cards, alerts), **access matrix** (users and profiles × panels, click to cycle
  inherit / show / hide), **users** (profiles, per-panel rules, default dashboard, drag & drop order, live sidebar preview),
  **profiles** (name, icon, color, members, rules, order) and **settings**. English and Spanish, light and dark themes, phone layout.
- Panels Home Assistant hides by default (Lights, Climate, Security…) stay hidden unless a rule explicitly shows them.
- Panel catalog grouped by kind: dashboards, Home Assistant, integrations, add-ons.

## 0.1.0 — 2026-10-26
- Rules engine: per-user and per-profile rules, default access, sidebar and default dashboard written to Home Assistant's
  per-user storage and re-applied when the user changes them, restore on release or removal, admin-only websocket API.
