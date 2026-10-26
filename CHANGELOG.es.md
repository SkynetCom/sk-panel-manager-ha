# Registro de cambios

🇬🇧 [English](CHANGELOG.md) · 🇪🇸 Español

## 0.2.0 — 2026-10-26
- **Panel de administración:** resumen (tarjetas por usuario, alertas), **matriz de acceso** (usuarios y perfiles × paneles,
  click para alternar heredar / mostrar / ocultar), **usuarios** (perfiles, reglas por panel, dashboard por defecto, orden con
  arrastrar y soltar, vista previa de la barra en vivo), **perfiles** (nombre, ícono, color, miembros, reglas, orden) y **ajustes**.
  Inglés y español, tema claro y oscuro, vista de celular.
- Los paneles que Home Assistant oculta por defecto (Luces, Clima, Seguridad…) siguen ocultos salvo que una regla los muestre.
- Catálogo de paneles agrupado por tipo: dashboards, Home Assistant, integraciones, complementos.
- `categories` en el manifest.

## 0.1.0 — 2026-10-26
- Motor de reglas: reglas por usuario y por perfil, acceso por defecto, barra lateral y dashboard por defecto escritos en el
  almacenamiento por usuario de Home Assistant y reaplicados si el usuario los cambia, restauración al liberar o desinstalar,
  API websocket solo para administradores.
