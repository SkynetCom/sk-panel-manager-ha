"""Config flow for SK Panel Manager."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlowWithReload
from homeassistant.core import callback

from .const import CONF_SIDEBAR_TITLE, DOMAIN, NAME, default_sidebar_title


def _schema(defaults: dict, language: str | None) -> vol.Schema:
    return vol.Schema({
        vol.Optional(
            CONF_SIDEBAR_TITLE,
            default=defaults.get(CONF_SIDEBAR_TITLE, default_sidebar_title(language)),
        ): str,
    })


class SKPanelManagerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Single instance config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        # A single instance is enforced by "single_config_entry" in manifest.json.
        if user_input is not None:
            return self.async_create_entry(title=NAME, data=user_input)
        return self.async_show_form(step_id="user", data_schema=_schema({}, self.hass.config.language))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlowWithReload:
        return SKPanelManagerOptionsFlow()


class SKPanelManagerOptionsFlow(OptionsFlowWithReload):
    """Options: sidebar title of the admin panel (the entry reloads when saved)."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = {**self.config_entry.data, **self.config_entry.options}
        return self.async_show_form(step_id="init", data_schema=_schema(current, self.hass.config.language))
