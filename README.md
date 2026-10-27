<p align="center">
  <img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/banner.png" alt="SK Panel Manager for Home Assistant" width="100%">
</p>

<p align="center">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SkynetCom&repository=sk-panel-manager-ha&category=integration"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open in HACS"></a>
  <a href="https://my.home-assistant.io/redirect/config_flow_start/?domain=sk_panel_manager"><img src="https://my.home-assistant.io/badges/config_flow_start.svg" alt="Add integration"></a>
  <br><a href="https://www.paypal.com/donate/?business=gerencia%40skynetcom.com.ar&currency_code=USD&item_name=SK+Panel+Manager"><img src="https://img.shields.io/badge/%E2%98%95%20Buy%20me%20a%20coffee-PayPal-ffdd00?logo=paypal&logoColor=003087&labelColor=ffdd00&style=for-the-badge" alt="Buy me a coffee"></a>
</p>

<p align="center">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/releases"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FSkynetCom%2Fsk-panel-manager-ha%2Fmain%2Fcustom_components%2Fsk_panel_manager%2Fmanifest.json&query=%24.version&prefix=v&label=version&color=3f51cd&cacheSeconds=3600" alt="Version"></a>
  <a href="https://hacs.xyz/docs/faq/custom_repositories/"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg" alt="HACS Custom"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2026.1%2B-18bcf2?logo=homeassistant&logoColor=white" alt="Home Assistant 2026.1+">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/actions/workflows/validate.yml"><img src="https://github.com/SkynetCom/sk-panel-manager-ha/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <img src="https://img.shields.io/badge/languages-EN%20%7C%20ES-2e9e6b" alt="Languages">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-8e44ad" alt="License"></a>
</p>

<p align="center">
  <b>Decide which panels and dashboards each Home Assistant user sees</b>, from one visual admin panel.<br>
  An access matrix, profiles such as <i>Kids</i>, <i>Guests</i> or <i>Wall tablet</i>, a default dashboard per user, a locked sidebar<br>and a <b>visual kiosk mode</b> per user, profile, device and dashboard.<br>
  No YAML, no editing every dashboard, and nothing that breaks with each Home Assistant update.<br>
  <sub>🇬🇧 English · 🇪🇸 <a href="https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/README.es.md">Español</a></sub>
</p>

---

## 🤔 Why

Home Assistant lets **each user** hide and reorder their own sidebar, but **an administrator can't do it for them**. The kids end up seeing *Energy* and *Logbook*, the kitchen tablet shows every dashboard, and a guest can open the cameras from the sidebar. The usual workarounds (Kiosk Mode, Custom Sidebar…) mean YAML pasted into each dashboard, users matched by display name, and a fix every time the frontend changes.

**SK Panel Manager** turns that into a screen: tick what each user or profile sees, press **Save**, and every sidebar changes live.

## ✨ Highlights

<table>
<tr>
<td width="33%" valign="top">

### 🧮 Access matrix
Every user and profile against every panel (dashboards, built-in panels, integrations, add-ons) on **one screen**. One click cycles *inherit → show → hide*. Inherited values are faded, and hovering a cell shows which rule decided it.

</td>
<td width="33%" valign="top">

### 👨‍👩‍👧 Profiles
Group rules into profiles such as **Kids**, **Guests**, **Wall tablet** or **Staff**, each with an icon and a colour. A user can have several, and their **permissions add up**. A rule set on the user always wins.

</td>
<td width="33%" valign="top">

### 👀 Live sidebar preview
While you edit a user, the right column shows **their sidebar exactly as it will look**: order, the dashboard they start on, and what stays hidden. Nothing changes until you press **Save**.

</td>
</tr>
<tr>
<td valign="top">

### 🏠 Default dashboard and order
Choose the dashboard each user or profile **starts on**, and **drag** the panels into the order you want. If a default dashboard gets hidden, users land on the first panel they're allowed to see.

</td>
<td valign="top">

### 🔒 Locked and redirected
Managed users **can't edit their sidebar** from their profile. If they open a hidden panel by its address (a link, a bookmark, the back button), they're sent to **their dashboard**. Both are optional.

</td>
<td valign="top">

### 🛡️ Safe by design
The **owner is never restricted**, so you can't lock yourself out. Administrators are only restricted if you turn that on. **Uninstalling gives every user back the sidebar they had before.**

</td>
</tr>
<tr>
<td colspan="3" valign="top">

### 🖥️ Visual kiosk mode
Hide the header, the sidebar, single buttons (search, Assist, edit, ⋮), sidebar items, parts of entity dialogs, or turn on a **full kiosk**, all with switches. Settings work in layers (**everyone → profile → user → device**), and each layer can do something different **on one dashboard**. A live mock of Home Assistant shows what gets hidden. Name your **devices** ("Kitchen tablet") and give them their own kiosk. [See the Kiosk section ↓](#%EF%B8%8F-kiosk-mode)

</td>
</tr>
<tr>
<td valign="top">

### 🕵️ View as…
Pick a user, a device and a dashboard and see **exactly what they get**: their sidebar, the kiosk mock, where a hidden dashboard sends them, and a **"Why"** table with the rule or layer behind every panel and option.

</td>
<td valign="top">

### 🔁 Coming from Kiosk Mode?
One click reads the `kiosk_mode:` block of every dashboard and turns it into kiosk settings here, users matched by name. It lists what couldn't be imported and why. Nothing changes until you press **Save**.

</td>
<td valign="top">

### 💾 Backup
**Export** the whole configuration to a file and **import** it later or into another Home Assistant. Users are matched by id, then by name. The import lands as unsaved changes you can review.

</td>
</tr>
<tr>
<td colspan="3" valign="top">

### 🧱 Built on Home Assistant, not on top of it
The integration writes each user's sidebar and default dashboard to **Home Assistant's own per-user storage**, the same place the profile's *Edit sidebar* dialog uses. The browser module only listens to Home Assistant's own events (dialogs and navigation). It never reaches into the page structure, so **frontend updates don't break it**. Constant breakage after updates is the most common complaint about kiosk-style plugins.

</td>
</tr>
</table>

## 🧭 How it works

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/flow.png" alt="Rules → SK Panel Manager → what each user sees" width="100%"></p>

1. **You set rules** on profiles and users. Panels without a rule follow a global policy: *show them* or *hide them*.
2. **SK Panel Manager writes each user's sidebar**, meaning which panels are hidden, their order and the default dashboard. If a user changes it from their profile, it's put back immediately.
3. **Every open browser updates live**: no reload needed. Dashboards created later follow the global policy automatically.

## 📸 Screenshots

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/matrix.png" alt="Access matrix" width="100%"><br><sub><b>Access matrix</b>: profiles on top, users below. Solid = set here, faded = inherited, lock = admin-only panel.</sub></p>

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/user.png" alt="User page with sidebar preview" width="100%"><br><sub><b>User page</b>: profiles, a rule per panel, default dashboard, drag &amp; drop order and the live sidebar preview.</sub></p>

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/overview.png" alt="Overview"><br><sub><b>Overview</b>: who sees how much, where each user starts, and alerts (for example, a user who can't see any panel).</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/profile.png" alt="Profile editor"><br><sub><b>Profile editor</b>: name, icon, colour, members, rules, default dashboard and order.</sub></td>
</tr>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/settings.png" alt="Settings in dark theme"><br><sub><b>Settings</b> (dark theme): policy for panels without a rule, administrators, locking and redirection, and what it protects.</sub></td>
<td width="50%" align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/mobile.png" alt="Phone layout" width="55%"><br><sub><b>On the phone</b>: the whole panel works on touch screens and in the companion app.</sub></td>
</tr>
</table>

## 🖥️ Kiosk mode

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/kiosk.png" alt="Kiosk editor" width="100%"><br><sub><b>Kiosk editor</b>: layers on the left, an override for the <i>Kids</i> dashboard, three-state switches and a mock of Home Assistant (hidden parts are outlined in red).</sub></p>

| Group | Options |
|---|---|
| Screen | Full kiosk · hide header · hide sidebar · hide menu button |
| Header buttons | Search · Assist · Edit dashboard · ⋮ menu |
| Sidebar items | Settings · Notifications · Profile |
| Entity dialogs | Block the dialog entirely · hide its ⚙ button · hide its ⋮ menu (history, logbook, related, attributes) |
| Interaction | Block the right-click / long-press menu · block touch and mouse (display-only screens) |

**How layers combine:** *General* (every managed user) → the user's **profiles** (an option turned on by any profile is on) → the **user** → the **device**. Inside each layer, a setting for a specific dashboard beats the "all dashboards" one. Every option has *Inherit / On / Off*, so a lower layer can turn something back off.

**Devices:** every browser or app that opens Home Assistant shows up in the *Devices* list with its last user. Give it a name and a kiosk. Device settings apply to **whoever uses that device**, including administrators: a wall tablet stays a wall tablet.

**Getting out:** an administrator can turn the kiosk off in one browser tab by adding `?skpm_disable` to the address, and back on with `?skpm_enable`. For anyone else the parameter does nothing.

## 🕵️ View as…

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/viewas.png" alt="View as" width="100%"><br><sub><b>View as…</b> Tomás on his phone, opening <i>Cameras</i>: it's hidden for him, so he lands on <i>Kids</i>. Every panel and kiosk option shows the rule or layer that decided it.</sub></p>

## 🔁 Import from Kiosk Mode

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/import.png" alt="Import from Kiosk Mode and backup" width="100%"><br><sub><b>Settings → Import from Kiosk Mode</b>: what will be added, what's skipped and why, and Kiosk Mode users that don't exist here.</sub></p>

| Kiosk Mode | Becomes |
|---|---|
| Options at the top of `kiosk_mode:` and in `non_admin_settings` | **General** layer, for that dashboard |
| `user_settings` (`users:` by name) | Each **user**'s layer, for that dashboard |
| `block_overflow` · `hide_dialog_header_settings` · `hide_dialog_header_overflow` · `hide_dialog_header_action_items` | Hide ⋮ menu · hide dialog ⚙ · hide dialog ⋮ · both |
| `admin_settings`, `mobile_settings`, JavaScript/Jinja templates, options with no equivalent | Listed as **not imported**, with the reason (use a named device instead of `mobile_settings`) |

After importing, check the result in **View as…** and then remove the `kiosk_mode:` block from your dashboards, so the two don't fight over the same options.

## 🆚 Compared with the usual options

| | Home Assistant alone | Kiosk Mode | Custom Sidebar | **SK Panel Manager** |
|---|:---:|:---:|:---:|:---:|
| An admin decides what **another user** sees | ❌ | ✅ | ✅ | ✅ |
| Visual editor, no YAML | — | ❌ | ❌ | ✅ |
| One screen for every user × every panel | ❌ | ❌ | ❌ | ✅ |
| Profiles / groups of users | ❌ | ❌ | ❌ | ✅ |
| Default dashboard set **per user** by an admin | ❌ | ❌ | ✅ | ✅ |
| Users matched by **ID** (renaming doesn't break rules) | — | ❌ | ❌ | ✅ |
| Doesn't depend on the frontend's page structure | ✅ | ❌ | ❌ | ✅ |
| Rules not readable without logging in | ✅ | ✅ | ❌ | ✅ |
| Hide header / kiosk mode | Partial | ✅ | ❌ | ✅ |
| Visual kiosk editor with a live preview | — | ❌ | — | ✅ |
| Kiosk per **device** (named wall tablets) | — | Partial | — | ✅ |
| Preview any user ("View as…") with the reason for every rule | ❌ | ❌ | ❌ | ✅ |
| Backup and restore of the rules | — | — | — | ✅ |

Kiosk Mode and Custom Sidebar are great projects. Kiosk Mode still offers things this one doesn't, such as JavaScript/Jinja templates and a few extra dialog options. SK Panel Manager is for managing **who sees what** across a whole household or business, visually.

## 🚀 Installation

### HACS (custom repository)
1. Click **Open in HACS** above, or go to **HACS → ⋮ → Custom repositories**, add `https://github.com/SkynetCom/sk-panel-manager-ha` with type **Integration**.
2. Search for **SK Panel Manager**, click **Download** and **restart Home Assistant**.
3. **Settings → Devices & services → + Add integration → SK Panel Manager** (or the **Add integration** button above).
4. **Panels** appears in the sidebar, for administrators only. If you don't see it, reload the browser with Ctrl+F5.

### Manual
Copy `custom_components/sk_panel_manager` into `config/custom_components/`, restart and continue from step 3.

| Requirement | Version |
|---|---|
| Home Assistant | 2026.1 or later |
| Own icon in the integrations list | 2026.3 or later (older versions show a generic icon) |

Nothing else to configure: the browser module is loaded automatically, with no `configuration.yaml` changes and no dashboard resources.

## ⚡ Get started in 4 steps

1. **Settings** → choose what happens to panels without a rule. *Show them* is the easiest way to start. *Hide them* is the strictest: new dashboards stay hidden until you allow them.
2. **Profiles** → **New profile** → name it (for example *Kids*), mark which panels to **Show** or **Hide**, pick its default dashboard and drag the order.
3. **Users** → open a user → turn on their **profiles**. Fine-tune any panel with **Show** or **Hide** on the user, and check the **sidebar preview** on the right.
4. **Save**. Open Home Assistant as that user: the sidebar has already changed.

The interface is available in **English and Spanish** and follows your Home Assistant language. Light and dark themes follow your Home Assistant theme.

## 👨‍👩‍👧 Profile ideas

| Profile | Shows | Hides | Starts on |
|---|---|---|---|
| **Kids** | Their dashboard, media | Energy, logbook, history, cameras, map | Kids dashboard |
| **Wall tablet** | One room dashboard, to-do lists | Everything else | Room dashboard |
| **Guests** | Overview, media | Cameras, energy, history, logbook, map | Overview |
| **Staff / gardener** | The panel they work with (e.g. irrigation) | Everything else | That panel |
| **Elderly parent** | A simple dashboard with big buttons | Everything technical | That dashboard |

## 🔐 What it protects and what it doesn't

- ✅ Hides panels from each user's sidebar and **keeps them hidden** (users can't un-hide them).
- ✅ Sets each user's **default dashboard**.
- ✅ Sends users who open a hidden panel by its address back to their dashboard.
- ❌ **It is not access control.** Home Assistant doesn't let an integration block a dashboard for one user and allow it for another. A user with technical knowledge can still read any dashboard's configuration and every entity's state through Home Assistant's API.

For **sensitive data** (cameras, alarm, locks), use **admin-only dashboards** (`require_admin`) or a separate Home Assistant user without access. Use SK Panel Manager to **organise** what everyone sees.

## ⚙️ Under the hood

- **Storage:** rules live in `.storage/sk_panel_manager.data` and are only readable by administrators. A non-admin user only ever receives **their own** effective rules, never anybody else's.
- **What it writes:** `sidebar` (`hiddenPanels`, `panelOrder`) and `core.default_panel` in each managed user's `.storage/frontend.user_data_<id>`, the same data the profile page edits. Before the first change it keeps a copy of what the user had, and puts it back when the user is released or the integration is removed.
- **Re-applying:** it listens for changes to each user's sidebar, new users and new panels (a dashboard you create later follows the rules right away).
- **Browser module:** `skpm-runtime.js` blocks the `dialog-edit-sidebar` dialog and watches navigation. It does nothing for users who aren't managed.
- **Kiosk:** *Full kiosk* uses Home Assistant's own kiosk mode (`hass-kiosk-mode`). Blocking dialogs and menus uses Home Assistant's events. Hiding single parts uses a small stylesheet in the matching part of the page. Every selector sits in one block at the top of `skpm-runtime.js`, and was checked against a real Home Assistant 2026.2.
- **Panels hidden by default:** Home Assistant hides some built-in dashboards (Lights, Climate, Security) until a user turns them on. They stay that way unless a rule explicitly shows them.

## ❓ FAQ

<details><summary><b>Can I lock myself out?</b></summary>

No. The owner is never restricted, and administrators are only restricted if you turn on *Restrict administrators*. The admin panel itself is always admin-only.
</details>

<details><summary><b>What happens if I uninstall it?</b></summary>

Every user gets back the sidebar and default dashboard they had before the integration changed them. Anything they changed on their own is kept.
</details>

<details><summary><b>Does it work in the companion app (iOS / Android)?</b></summary>

Yes. The app uses the same frontend, so the sidebar, default dashboard, locking and redirection work there too. If a change doesn't show up, close the app and open it again.
</details>

<details><summary><b>I created a new dashboard. Do I have to add it everywhere?</b></summary>

No. New panels follow the global policy in *Settings*. With *Show them*, everyone sees it except users or profiles that hide it. With *Hide them*, nobody sees it until you allow it.
</details>

<details><summary><b>Can I use it together with Kiosk Mode?</b></summary>

Yes, SK Panel Manager doesn't touch dashboard YAML. Avoid turning on the same option in both on the same dashboard, or you won't know which one is hiding it.
</details>

<details><summary><b>A tablet is stuck in kiosk mode. How do I get out?</b></summary>

Sign in as an administrator on it and add `?skpm_disable` to the address (for example `http://homeassistant.local:8123/lovelace/0?skpm_disable`). Kiosk is off in that tab until you add `?skpm_enable` or close it. You can also change the device's settings from any other device.
</details>

<details><summary><b>A user still sees a panel I hid</b></summary>

Open **View as…** with that user and device: it shows the final result and, in *Why*, which rule decided each panel and option. Owners and (by default) administrators are never managed. If the rules look right, reload that user's browser.
</details>

## 🗺️ Roadmap

- [x] Rules engine with profiles, default dashboard and order (0.1)
- [x] Visual admin panel: overview, access matrix, users, profiles, settings (0.2)
- [x] Browser module: locked sidebar editing and redirection of hidden panels (0.3)
- [x] **Kiosk mode editor** per user, profile, device and dashboard, and named **devices** (0.4)
- [x] **View as…**, **import from Kiosk Mode** and **backup** (0.5)
- [x] **1.0**: diagnostics, first stable release
- [ ] Schedules: rules that only apply at certain times (e.g. *Kids* see Media from 17:00 to 20:00)
- [ ] Optional best-effort blocking of hidden dashboards' configuration

## 🛠️ Development

```bash
# UI demo with a mocked backend (no Home Assistant needed)
python3 -m http.server 8766   # then open http://localhost:8766/dev/demo.html (?lang=en, ?tab=matrix, ?dark=1)
# Test page for the browser module: http://localhost:8766/dev/runtime.html

# Tests: pure logic, JS/Python resolver parity, and integration with a real HA
pip install pytest-homeassistant-custom-component
pytest tests

# Regenerate the README screenshots (needs Google Chrome and the server above)
./dev/shots.sh
```

Layout: `custom_components/sk_panel_manager/` (rules engine, per-user storage, websocket API), `frontend/` (admin panel and browser module, no build step), `brand/` (icons for HA 2026.3+), `tests/`, `dev/` (demo and test pages), `docs/` (images and their sources).

Release history in [CHANGELOG.md](https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/CHANGELOG.md).

## ☕ Support the project
If SK Panel Manager saves you time (and a few arguments at home), you can buy me a coffee so I can keep improving it. Thank you!

<p align="center"><a href="https://www.paypal.com/donate/?business=gerencia%40skynetcom.com.ar&currency_code=USD&item_name=SK+Panel+Manager"><img src="https://img.shields.io/badge/%E2%98%95%20Buy%20me%20a%20coffee-PayPal-ffdd00?logo=paypal&logoColor=003087&labelColor=ffdd00&style=for-the-badge" alt="Buy me a coffee"></a></p>

Also by SkynetCom: [SK Irrigation Manager](https://github.com/SkynetCom/sk-irrigation-manager-ha), a visual irrigation manager for Home Assistant.

## 📄 License
[MIT](https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/LICENSE)
