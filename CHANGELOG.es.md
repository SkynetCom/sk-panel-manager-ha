# Registro de cambios

🇬🇧 [English](CHANGELOG.md) · 🇪🇸 Español

## 1.0.4 — 2026-10-27
- **Corregido para Home Assistant 2026.10:** la barra lateral cambió en 2026.10 y algunas opciones del kiosk dejaron de
  funcionar ahí.
  - *Ocultar barra lateral* dejaba una franja blanca vacía donde estaba la barra. El dashboard y su encabezado vuelven a
    ocupar todo el ancho (como con *Kiosk completo*).
  - *Ocultar Configuración*, *Ocultar Notificaciones* y *Ocultar perfil* no ocultaban esos ítems de la barra.
  - En versiones anteriores las dos cosas siguen funcionando igual.
- **Ocultar barra lateral también oculta el botón ☰ en el teléfono:** sin barra, el botón solo abría un menú vacío. La vista
  previa del kiosk también lo muestra oculto.

## 1.0.3 — 2026-10-27
- **Desplegables con el estilo del panel en todos lados:** los menús propios del navegador se reemplazan por un desplegable
  del panel (íconos, avatares de usuarios, tilde en la opción elegida, flechas del teclado, Escape y click afuera para
  cerrar) en *Ver como…* y en *Ajuste para un dashboard* de la pestaña Kiosk.
- Corregido: el aviso de "versión anterior de este panel" (y otros avisos arriba de una página) quedaba pegado a las
  tarjetas de abajo; recuperó su separación. Los avisos dentro de las tarjetas mantienen su espaciado.

## 1.0.2 — 2026-10-27
- **Dashboard por defecto con un toque:** se fue el desplegable. En la tarjeta *Orden y dashboard por defecto* de usuarios y
  perfiles, tocá la casa junto a un dashboard para que el usuario entre ahí; tocala de nuevo para volver a lo heredado. Una
  casa tenue indica un valor heredado de un perfil, y una línea arriba de la lista dice en qué dashboard entra.
- **Selector de íconos para perfiles:** un botón abre una grilla con buscador sobre la lista de íconos de Home Assistant
  (unos 7.000, por nombre y palabras clave, los mejores primero) y sugeridos antes de escribir. Ya no hay que escribir `mdi:`.
- **Corregido:** en el editor de perfiles, la lista de orden y sus controles podían salirse de su tarjeta en algunos anchos de
  pantalla. La columna de orden es más ancha y nada dentro de una columna puede agrandarla.

## 1.0.1 — 2026-10-27
- **Agregar la integración ya no se puede trabar:** el arranque ya no espera a que se apliquen las reglas a todos los usuarios
  (eso ahora pasa justo después, en segundo plano). En una instalación lenta o particular, el diálogo *Agregar integración*
  podía quedar girando y la integración quedaba "ya se está configurando".
- **Refuerzos de seguridad** (de una revisión completa antes de pedir el ingreso a la tienda de HACS):
  - Al importar una copia de seguridad solo se conservan valores bien formados, y todo color que muestra el panel se valida,
    así que un archivo manipulado no puede ejecutar código en el navegador del administrador.
  - Después de descargar o quitar la integración, nada puede volver a aplicar reglas viejas; al desinstalar, si no se pudo
    restaurar la barra de algún usuario, los datos se conservan en vez de perderse.
  - Recargar la integración (por ejemplo, después de cambiar su título) vuelve a enviar las reglas, así las tablets siguen en kiosk.
  - Un usuario que no es administrador puede registrar como mucho 5 navegadores y no puede llenar la lista de dispositivos;
    un navegador que vuelve a abrir Home Assistant ya no provoca una escritura cada vez.
  - Validación más estricta de la configuración guardada (tipos, límites, nombres de íconos) con errores claros.
  - El módulo del navegador ignora direcciones mal formadas, nunca deja que un error llegue a la conexión de Home Assistant
    y no hace trabajo en usuarios sin opciones de kiosk. Los usuarios que no son admin ya no reciben ids internos de perfiles.
  - El diagnóstico reemplaza todos los ids de perfiles por alias.
- Diálogo de instalación: una descripción breve para el campo del título; un segundo intento lo rechaza Home Assistant de forma
  limpia (una sola instancia). Cambiar las opciones recarga la integración con el mecanismo propio de Home Assistant.
- Los tests corren en una versión vieja y en la actual de Home Assistant (Python 3.13 y 3.14), también todas las semanas;
  tests nuevos para el diálogo de instalación y cada corrección de arriba.
- README: nota de compatibilidad (usa el almacenamiento por usuario del frontend de Home Assistant, que no es una API pública),
  el modo kiosk tampoco es una barrera de seguridad, redacción más medida e imágenes unas 4 veces más livianas.

## 1.0.0 — 2026-10-27
Primera versión estable.
- **Diagnóstico:** *Ajustes → Dispositivos y servicios → SK Panel Manager → ⋮ → Descargar diagnóstico* ahora incluye las reglas
  y su efecto, sin nombres ni ids de usuarios ni nombres de dispositivos. Adjuntalo cuando reportes un problema.
- Las vistas previas (Usuarios, Ver como…) muestran que Home Assistant solo lista el dashboard principal (*Resumen*) cuando
  es el dashboard por defecto del usuario, igual que la barra real; *Ver como…* redirige con la misma regla que el módulo del navegador.
- Probado de punta a punta en un Home Assistant real con un usuario no administrador: paneles ocultos, dashboard por defecto,
  redirección, bloqueo de la edición de la barra (botón *Editar* del perfil), cambios hechos por la API que vuelven a su lugar,
  opciones de kiosk, y sin acceso al panel de administración ni a sus comandos.
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
