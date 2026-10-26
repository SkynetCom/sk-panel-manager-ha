<p align="center">
  <img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/custom_components/sk_panel_manager/brand/logo@2x.png" alt="SK Panel Manager" width="420">
</p>

# SK Panel Manager para Home Assistant

🇬🇧 [English](README.md) · 🇪🇸 Español

Elegí qué paneles y dashboards ve cada usuario de Home Assistant, desde un único panel solo para administradores.

> **Estado: en desarrollo (0.1.0).** El motor de reglas funciona; el panel gráfico completo y el editor de kiosk vienen a continuación.

## Cómo funciona
- Reglas por **usuario** y por **perfil** (por ejemplo *Chicos*, *Invitados*, *Tablet*). Con varios perfiles, los permisos se suman; una regla puesta en el usuario siempre gana.
- La integración escribe la barra lateral y el dashboard por defecto de cada usuario en el **almacenamiento por usuario de Home Assistant** (el mismo que usa *Editar barra lateral* del perfil) y los vuelve a poner si el usuario los cambia.
- El **dueño nunca queda restringido**. Los administradores solo si lo activás.
- Al quitar la integración, cada usuario recupera la barra lateral que tenía antes.

## Qué protege y qué no
- ✅ Oculta paneles de la barra lateral de cada usuario y los mantiene ocultos.
- ✅ Fija el dashboard por defecto de cada usuario.
- ❌ **No es un control de acceso.** Un usuario con conocimientos técnicos igual puede leer la configuración de cualquier dashboard y el estado de las entidades por la API de Home Assistant. Para datos sensibles, usá dashboards solo para administradores o usuarios separados.

## Requisitos
Home Assistant **2026.1** o posterior.

## Licencia
MIT
