# Registro de cambios

🇬🇧 [English](CHANGELOG.md) · 🇪🇸 Español

## 1.0.0 — 2026-10-27
Primera versión estable.
- **Diagnóstico:** *Ajustes → Dispositivos y servicios → SK Panel Manager → ⋮ → Descargar diagnóstico* ahora incluye las reglas
  y su efecto, sin nombres ni ids de usuarios ni nombres de dispositivos. Adjuntalo cuando reportes un problema.
- A un usuario sin barra guardada y sin reglas que aplicar ya no se le escribe nada: instalar la integración no toca la barra
  de nadie hasta que una regla lo necesite.

## 0.5.0 — 2026-10-27
- **Ver como…** (nueva pestaña): elegí un usuario, un dispositivo y un dashboard y mirá su barra lateral, la maqueta del
  kiosk y adónde lo manda un dashboard oculto, más una tabla **Por qué** con la regla o la capa detrás de cada panel y opción.
- **Importar desde Kiosk Mode** (Ajustes): lee el bloque `kiosk_mode:` de cada dashboard y convierte las opciones generales,
  `non_admin_settings` y `user_settings` en ajustes de kiosk (usuarios buscados por nombre). Lista lo que no se puede importar
  y por qué (`admin_settings`, `mobile_settings`, plantillas, opciones sin equivalente). No se guarda nada hasta que apretás Guardar.
- **Copia de seguridad** (Ajustes): exportá la configuración a un archivo JSON e importala acá o en otro Home Assistant;
  los usuarios se buscan por id y después por nombre, y lo importado queda como cambios sin guardar, con un informe.

## 0.4.0 — 2026-10-27
- **Editor de modo kiosk** (nueva pestaña *Kiosk*): kiosk completo; ocultar encabezado, barra lateral y botón de menú;
  ocultar búsqueda, Assist, editar y ⋮ del encabezado; ocultar Configuración, Notificaciones y Perfil de la barra; bloquear
  los diálogos de entidades u ocultar sus ⚙ y ⋮; bloquear el menú contextual o todo toque y mouse.
- **Capas:** general → perfiles → usuario → dispositivo, cada una con *Heredar / Sí / No* y ajustes propios para dashboards
  puntuales. Una maqueta de Home Assistant en vivo muestra qué oculta cada capa.
- **Dispositivos:** cada navegador o app que abre Home Assistant aparece con su último usuario; ponele nombre y su propio
  kiosk. Los ajustes del dispositivo se aplican a quien lo use. Un admin puede apagar el kiosk en una pestaña con `?skpm_disable`.
- El kiosk completo usa el modo kiosk propio de Home Assistant; el resto usa eventos de Home Assistant o una hoja de estilos
  chica, con todos los selectores en un solo lugar y verificados contra un Home Assistant 2026.2 real.
- Los avatares usan solo letras para las iniciales ("Ana (admin)" → "AA").

## 0.3.0 — 2026-10-26
- **Módulo del navegador**, que se carga solo en todas las páginas. Solo para usuarios gestionados:
  - **Bloquear la edición de la barra:** el botón *Editar* del perfil y la pulsación larga en la barra muestran un aviso en vez del editor.
  - **Redirigir paneles ocultos:** si se abre un panel oculto por su dirección (enlace, favorito, botón atrás), va al
    dashboard por defecto del usuario, con un aviso.
  - Las reglas llegan en vivo: lo que guarda un admin se aplica sin recargar el navegador.
- Usa los eventos propios de Home Assistant (diálogos, navegación), no la estructura de la página, así que las actualizaciones del frontend no lo rompen.

## 0.2.0 — 2026-10-26
- **Panel de administración:** resumen (tarjetas por usuario, alertas), **matriz de acceso** (usuarios y perfiles × paneles,
  click para alternar heredar / mostrar / ocultar), **usuarios** (perfiles, reglas por panel, dashboard por defecto, orden con
  arrastrar y soltar, vista previa de la barra en vivo), **perfiles** (nombre, ícono, color, miembros, reglas, orden) y **ajustes**.
  Inglés y español, tema claro y oscuro, vista de celular.
- Los paneles que Home Assistant oculta por defecto (Luces, Clima, Seguridad…) siguen ocultos salvo que una regla los muestre.
- Catálogo de paneles agrupado por tipo: dashboards, Home Assistant, integraciones, complementos.

## 0.1.0 — 2026-10-26
- Motor de reglas: reglas por usuario y por perfil, acceso por defecto, barra lateral y dashboard por defecto escritos en el
  almacenamiento por usuario de Home Assistant y reaplicados si el usuario los cambia, restauración al liberar o desinstalar,
  API websocket solo para administradores.
