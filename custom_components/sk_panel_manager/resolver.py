"""Turn the configuration into what each user actually gets (pure Python, no Home Assistant).

Rules, from weakest to strongest:
1. ``settings.default_access`` for a panel nobody configured.
2. The user's profiles. With several profiles, permissions add up: one "allow" is enough.
3. The user's own override, which always wins.

The owner is never managed. Admins only when ``settings.restrict_admins`` is on.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable


@dataclass(frozen=True)
class PanelInfo:
    """A sidebar panel as the resolver needs it."""

    url_path: str
    title: str | None = None
    icon: str | None = None
    require_admin: bool = False
    default_visible: bool = True


@dataclass(frozen=True)
class UserInfo:
    """A Home Assistant user as the resolver needs it."""

    id: str
    name: str = ""
    is_admin: bool = False
    is_owner: bool = False
    system_generated: bool = False


@dataclass
class Effective:
    """What a user gets. ``managed`` False means the integration leaves the user alone."""

    managed: bool
    reason: str | None = None              # why the user isn't managed
    allowed: list[str] = field(default_factory=list)
    hidden: list[str] = field(default_factory=list)
    order: list[str] | None = None         # None: keep the user's own order
    default_panel: str | None = None       # None: keep the user's / system choice
    sources: dict[str, str] = field(default_factory=dict)  # panel -> "default" | "profile:<id>" | "user"

    def as_dict(self) -> dict[str, Any]:
        return {
            "managed": self.managed,
            "reason": self.reason,
            "allowed": list(self.allowed),
            "hidden": list(self.hidden),
            "order": list(self.order) if self.order is not None else None,
            "default_panel": self.default_panel,
            "sources": dict(self.sources),
        }


def unmanaged_reason(config: dict, user: UserInfo) -> str | None:
    """Return why this user isn't managed, or None if it is."""
    if user.system_generated:
        return "system"
    if user.is_owner:
        return "owner"
    if user.is_admin and not config["settings"]["restrict_admins"]:
        return "admin"
    user_cfg = config["users"].get(user.id)
    if user_cfg is not None and not user_cfg["managed"]:
        return "excluded"
    return None


def _decide(config: dict, user_cfg: dict | None, panel: str) -> tuple[str, str]:
    """Return (access, source) for one panel."""
    if user_cfg and panel in user_cfg["panels"]:
        return user_cfg["panels"][panel], "user"
    profile_values: list[tuple[str, str]] = []
    for pid in (user_cfg or {}).get("profiles", []):
        profile = config["profiles"].get(pid)
        if profile and panel in profile["panels"]:
            profile_values.append((profile["panels"][panel], pid))
    for value, pid in profile_values:
        if value == "allow":
            return "allow", f"profile:{pid}"
    if profile_values:
        return "deny", f"profile:{profile_values[0][1]}"
    return config["settings"]["default_access"], "default"


def referenced_panels(config: dict) -> set[str]:
    """Every panel id mentioned anywhere in the configuration."""
    out: set[str] = set()
    for item in [*config["profiles"].values(), *config["users"].values()]:
        out.update(item["panels"])
    return out


def resolve(config: dict, user: UserInfo, panels: Iterable[PanelInfo]) -> Effective:
    """Compute the effective sidebar of one user."""
    reason = unmanaged_reason(config, user)
    if reason:
        return Effective(managed=False, reason=reason)

    user_cfg = config["users"].get(user.id)
    catalog = [p.url_path for p in panels if not (p.require_admin and not user.is_admin)]
    # Panels mentioned in the config but not registered right now (an integration still
    # starting, a dashboard deleted) are decided too, so they stay hidden if denied.
    ids = list(dict.fromkeys([*catalog, *sorted(referenced_panels(config))]))

    eff = Effective(managed=True)
    for panel in ids:
        access, source = _decide(config, user_cfg, panel)
        eff.sources[panel] = source
        if access == "allow":
            if panel in catalog:
                eff.allowed.append(panel)
        else:
            eff.hidden.append(panel)

    profiles = [config["profiles"][p] for p in (user_cfg or {}).get("profiles", []) if p in config["profiles"]]

    order = (user_cfg or {}).get("panel_order")
    if order is None:
        order = next((p["panel_order"] for p in profiles if p["panel_order"]), None)
    if order is not None:
        eff.order = [p for p in order if p in eff.allowed]

    default_panel = (user_cfg or {}).get("default_panel")
    if default_panel is None:
        default_panel = next((p["default_panel"] for p in profiles if p["default_panel"]), None)
    if default_panel is not None and default_panel not in eff.allowed:
        default_panel = first_allowed(eff)
    eff.default_panel = default_panel
    return eff


def first_allowed(eff: Effective) -> str | None:
    """The panel a user lands on when the configured one is not allowed."""
    for panel in [*(eff.order or []), *eff.allowed]:
        if panel in eff.allowed:
            return panel
    return None


def merge_hidden(current: list[str], previously_enforced: list[str], enforced: list[str]) -> list[str]:
    """Hidden panels to store for a user.

    Keeps what the user hid on their own (``current`` minus what we hid last time) and adds
    what the configuration hides now. A panel we stop hiding comes back, unless the user had
    hidden it themselves.
    """
    own = [p for p in current if p not in previously_enforced]
    return list(dict.fromkeys([*own, *enforced]))


def restore_hidden(current: list[str], previously_enforced: list[str], snapshot: list[str] | None) -> list[str]:
    """Hidden panels when the integration lets a user go: drop what we hid, keep their own."""
    original = set(snapshot or [])
    return [p for p in current if p not in previously_enforced or p in original]
