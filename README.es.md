<p align="center">
  <img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/banner.es.png" alt="SK Panel Manager para Home Assistant" width="100%">
</p>

<p align="center">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SkynetCom&repository=sk-panel-manager-ha&category=integration"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Abrir en HACS"></a>
  <a href="https://my.home-assistant.io/redirect/config_flow_start/?domain=sk_panel_manager"><img src="https://my.home-assistant.io/badges/config_flow_start.svg" alt="Agregar integración"></a>
  <br><a href="https://www.paypal.com/donate/?business=gerencia%40skynetcom.com.ar&currency_code=USD&item_name=SK+Panel+Manager"><img src="https://img.shields.io/badge/%E2%98%95%20Invitame%20un%20caf%C3%A9-PayPal-ffdd00?logo=paypal&logoColor=003087&labelColor=ffdd00&style=for-the-badge" alt="Invitame un café"></a>
</p>

<p align="center">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/releases"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FSkynetCom%2Fsk-panel-manager-ha%2Fmain%2Fcustom_components%2Fsk_panel_manager%2Fmanifest.json&query=%24.version&prefix=v&label=versi%C3%B3n&color=3f51cd&cacheSeconds=3600" alt="Versión"></a>
  <a href="https://hacs.xyz/docs/faq/custom_repositories/"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg" alt="HACS Custom"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2026.1%2B-18bcf2?logo=homeassistant&logoColor=white" alt="Home Assistant 2026.1+">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/actions/workflows/validate.yml"><img src="https://github.com/SkynetCom/sk-panel-manager-ha/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <img src="https://img.shields.io/badge/idiomas-EN%20%7C%20ES-2e9e6b" alt="Idiomas">
  <a href="https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-8e44ad" alt="Licencia"></a>
</p>

<p align="center">
  <b>Decidí qué paneles y dashboards ve cada usuario de Home Assistant</b>, desde un único panel visual.<br>
  Matriz de acceso, perfiles como <i>Chicos</i>, <i>Invitados</i> o <i>Tablet de pared</i>, dashboard por defecto por usuario y barra lateral bloqueada.<br>
  Sin YAML, sin tocar cada dashboard y sin que se rompa con cada actualización de Home Assistant.<br>
  <sub>🇬🇧 <a href="https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/README.md">English</a> · 🇪🇸 Español</sub>
</p>

---

## 🤔 Por qué

Home Assistant deja que **cada usuario** oculte y ordene su propia barra lateral, pero **un administrador no puede hacerlo por él**. Así, los chicos terminan viendo *Energía* y *Registro*, la tablet de la cocina muestra todos los dashboards y un invitado abre las cámaras desde la barra. Las soluciones habituales (Kiosk Mode, Custom Sidebar…) piden YAML pegado en cada dashboard, reconocen a los usuarios por su nombre visible y hay que arreglarlas cada vez que cambia el frontend.

**SK Panel Manager** lo convierte en una pantalla: marcás qué ve cada usuario o perfil, apretás **Guardar** y la barra de cada uno cambia en vivo.

## ✨ Lo más destacado

<table>
<tr>
<td width="33%" valign="top">

### 🧮 Matriz de acceso
Todos los usuarios y perfiles contra todos los paneles (dashboards, paneles de Home Assistant, integraciones, complementos) en **una sola pantalla**. Un click alterna *heredar → mostrar → ocultar*. Lo heredado se ve tenue y, al pasar el mouse, dice qué regla lo decidió.

</td>
<td width="33%" valign="top">

### 👨‍👩‍👧 Perfiles
Agrupá reglas en perfiles como **Chicos**, **Invitados**, **Tablet de pared** o **Personal**, cada uno con ícono y color. Un usuario puede tener varios y **los permisos se suman**. Una regla puesta en el usuario siempre gana.

</td>
<td width="33%" valign="top">

### 👀 Vista previa en vivo
Mientras editás un usuario, la columna derecha muestra **su barra lateral tal como va a quedar**: orden, el dashboard en el que entra y lo que queda oculto. No cambia nada hasta que apretás **Guardar**.

</td>
</tr>
<tr>
<td valign="top">

### 🏠 Dashboard por defecto y orden
Elegí en qué dashboard **entra** cada usuario o perfil y **arrastrá** los paneles al orden que quieras. Si el dashboard por defecto queda oculto, el usuario entra en el primer panel que tiene permitido.

</td>
<td valign="top">

### 🔒 Bloqueado y redirigido
Los usuarios gestionados **no pueden editar su barra** desde el perfil. Si abren un panel oculto por su dirección (un enlace, un favorito, el botón atrás), van a **su dashboard**. Las dos cosas son opcionales.

</td>
<td valign="top">

### 🛡️ Seguro por diseño
El **dueño nunca se restringe**, así que no te podés quedar afuera. Los administradores solo si lo activás. **Al desinstalar, cada usuario recupera la barra que tenía antes.**

</td>
</tr>
<tr>
<td colspan="3" valign="top">

### 🧱 Construido sobre Home Assistant, no encima
La integración escribe la barra lateral y el dashboard por defecto de cada usuario en el **almacenamiento por usuario de Home Assistant**, el mismo que usa *Editar barra lateral* del perfil. El módulo del navegador solo escucha eventos propios de Home Assistant (diálogos y navegación). Nunca toca la estructura de la página, así que **las actualizaciones del frontend no lo rompen**. Que se rompan después de cada actualización es la queja más común de los plugins tipo kiosk.

</td>
</tr>
</table>

## 🧭 Cómo funciona

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/flow.es.png" alt="Reglas → SK Panel Manager → lo que ve cada usuario" width="100%"></p>

1. **Definís reglas** en perfiles y usuarios. Los paneles sin regla siguen una política general: *mostrarlos* u *ocultarlos*.
2. **SK Panel Manager escribe la barra lateral de cada usuario**: qué paneles se ocultan, en qué orden van y cuál es el dashboard por defecto. Si el usuario la cambia desde su perfil, vuelve a quedar como estaba al instante.
3. **Todos los navegadores abiertos se actualizan en vivo**, sin recargar. Los dashboards que crees después siguen la política general solos.

## 📸 Capturas

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/matrix.es.png" alt="Matriz de acceso" width="100%"><br><sub><b>Matriz de acceso</b>: arriba los perfiles, abajo los usuarios. Lleno = puesto acá, tenue = heredado, candado = panel solo para admins.</sub></p>

<p align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/user.es.png" alt="Ficha de usuario con vista previa de la barra" width="100%"><br><sub><b>Ficha de usuario</b>: perfiles, una regla por panel, dashboard por defecto, orden con arrastrar y soltar, y la vista previa de la barra en vivo.</sub></p>

<table>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/overview.es.png" alt="Resumen"><br><sub><b>Resumen</b>: cuánto ve cada uno, dónde entra cada usuario y alertas (por ejemplo, un usuario que no ve ningún panel).</sub></td>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/profile.es.png" alt="Editor de perfiles"><br><sub><b>Editor de perfiles</b>: nombre, ícono, color, miembros, reglas, dashboard por defecto y orden.</sub></td>
</tr>
<tr>
<td width="50%"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/settings.es.png" alt="Ajustes en tema oscuro"><br><sub><b>Ajustes</b> (tema oscuro): política para paneles sin regla, administradores, bloqueo, redirección y qué protege.</sub></td>
<td width="50%" align="center"><img src="https://raw.githubusercontent.com/SkynetCom/sk-panel-manager-ha/main/docs/mobile.es.png" alt="Vista de celular" width="55%"><br><sub><b>En el celular</b>: todo el panel funciona en pantallas táctiles y en la app de Home Assistant.</sub></td>
</tr>
</table>

## 🆚 Comparado con las opciones habituales

| | Home Assistant solo | Kiosk Mode | Custom Sidebar | **SK Panel Manager** |
|---|:---:|:---:|:---:|:---:|
| Un admin decide qué ve **otro usuario** | ❌ | ✅ | ✅ | ✅ |
| Editor visual, sin YAML | — | ❌ | ❌ | ✅ |
| Una pantalla con todos los usuarios × todos los paneles | ❌ | ❌ | ❌ | ✅ |
| Perfiles / grupos de usuarios | ❌ | ❌ | ❌ | ✅ |
| Dashboard por defecto **por usuario** elegido por un admin | ❌ | ❌ | ✅ | ✅ |
| Usuarios por **ID** (renombrar no rompe las reglas) | — | ❌ | ❌ | ✅ |
| No depende de la estructura de la página del frontend | ✅ | ❌ | ❌ | ✅ |
| Reglas que no se leen sin iniciar sesión | ✅ | ✅ | ❌ | ✅ |
| Ocultar encabezado / modo kiosk | Parcial | ✅ | ❌ | 🔜 v1.0 |

Kiosk Mode y Custom Sidebar son muy buenos proyectos y hacen cosas que este (todavía) no hace. Si solo necesitás ocultar el encabezado en una tablet de pared, Kiosk Mode sigue siendo una buena opción. SK Panel Manager es para administrar **quién ve qué** en toda una casa o empresa, de forma visual.

## 🚀 Instalación

### HACS (repositorio personalizado)
1. Hacé click en **Abrir en HACS** (arriba), o andá a **HACS → ⋮ → Repositorios personalizados** y agregá `https://github.com/SkynetCom/sk-panel-manager-ha` con tipo **Integración**.
2. Buscá **SK Panel Manager**, hacé click en **Descargar** y **reiniciá Home Assistant**.
3. **Ajustes → Dispositivos y servicios → + Agregar integración → SK Panel Manager** (o el botón **Agregar integración** de arriba).
4. **Paneles** aparece en la barra lateral, solo para administradores. Si no lo ves, recargá el navegador con Ctrl+F5.

### Manual
Copiá `custom_components/sk_panel_manager` en `config/custom_components/`, reiniciá y seguí desde el paso 3.

| Requisito | Versión |
|---|---|
| Home Assistant | 2026.1 o posterior |
| Ícono propio en la lista de integraciones | 2026.3 o posterior (las anteriores muestran un ícono genérico) |

No hay nada más que configurar: el módulo del navegador se carga solo, sin tocar `configuration.yaml` ni los recursos de los dashboards.

## ⚡ Empezá en 4 pasos

1. **Ajustes** → elegí qué pasa con los paneles sin regla. *Mostrarlos* es lo más fácil para empezar. *Ocultarlos* es lo más estricto: los dashboards nuevos quedan ocultos hasta que los permitas.
2. **Perfiles** → **Nuevo perfil** → ponele nombre (por ejemplo *Chicos*), marcá qué paneles **Mostrar** u **Ocultar**, elegí su dashboard por defecto y arrastrá el orden.
3. **Usuarios** → abrí un usuario → activá sus **perfiles**. Ajustá cualquier panel con **Mostrar** u **Ocultar** en el usuario y revisá la **vista previa** de la derecha.
4. **Guardar**. Abrí Home Assistant con ese usuario: la barra ya cambió.

La interfaz está en **inglés y español** y sigue el idioma de Home Assistant. Los temas claro y oscuro siguen el tema de Home Assistant.

## 👨‍👩‍👧 Ideas de perfiles

| Perfil | Muestra | Oculta | Entra en |
|---|---|---|---|
| **Chicos** | Su dashboard, multimedia | Energía, registro, historial, cámaras, mapa | Dashboard de los chicos |
| **Tablet de pared** | El dashboard de ese ambiente, listas | Todo lo demás | Dashboard del ambiente |
| **Invitados** | Resumen, multimedia | Cámaras, energía, historial, registro, mapa | Resumen |
| **Personal / jardinero** | El panel con el que trabaja (por ejemplo, riego) | Todo lo demás | Ese panel |
| **Padres mayores** | Un dashboard simple con botones grandes | Todo lo técnico | Ese dashboard |

## 🔐 Qué protege y qué no

- ✅ Oculta paneles de la barra lateral de cada usuario y **los mantiene ocultos** (el usuario no los puede volver a mostrar).
- ✅ Fija el **dashboard por defecto** de cada usuario.
- ✅ Si un usuario abre un panel oculto por su dirección, lo devuelve a su dashboard.
- ❌ **No es un control de acceso.** Home Assistant no permite que una integración bloquee un dashboard para un usuario y lo permita para otro. Un usuario con conocimientos técnicos igual puede leer la configuración de cualquier dashboard y el estado de todas las entidades por la API de Home Assistant.

Para **datos sensibles** (cámaras, alarma, cerraduras), usá **dashboards solo para administradores** (`require_admin`) o un usuario de Home Assistant aparte, sin acceso. SK Panel Manager sirve para **ordenar** lo que ve cada uno.

## ⚙️ Por dentro

- **Almacenamiento:** las reglas viven en `.storage/sk_panel_manager.data` y solo las leen los administradores. Un usuario que no es admin solo recibe **sus propias** reglas, nunca las de otros.
- **Qué escribe:** `sidebar` (`hiddenPanels`, `panelOrder`) y `core.default_panel` en `.storage/frontend.user_data_<id>` de cada usuario gestionado, los mismos datos que edita la página del perfil. Antes del primer cambio guarda una copia de lo que tenía el usuario y la restaura cuando se lo libera o se quita la integración.
- **Reaplicación:** escucha los cambios en la barra de cada usuario, los usuarios nuevos y los paneles nuevos (un dashboard que crees después sigue las reglas al instante).
- **Módulo del navegador:** `skpm-runtime.js` bloquea el diálogo `dialog-edit-sidebar` y vigila la navegación. No hace nada con los usuarios que no se gestionan.
- **Paneles ocultos por defecto:** Home Assistant oculta algunos dashboards propios (Luces, Clima, Seguridad) hasta que el usuario los activa. Siguen así salvo que una regla los muestre explícitamente.

## ❓ Preguntas frecuentes

<details><summary><b>¿Me puedo quedar afuera?</b></summary>

No. El dueño nunca se restringe, y los administradores solo si activás *Restringir administradores*. El panel de administración es siempre solo para admins.
</details>

<details><summary><b>¿Qué pasa si lo desinstalo?</b></summary>

Cada usuario recupera la barra lateral y el dashboard por defecto que tenía antes de que la integración los cambiara. Lo que haya cambiado por su cuenta se conserva.
</details>

<details><summary><b>¿Funciona en la app (iOS / Android)?</b></summary>

Sí. La app usa el mismo frontend, así que la barra, el dashboard por defecto, el bloqueo y la redirección funcionan igual. Si un cambio no aparece, cerrá la app y volvé a abrirla.
</details>

<details><summary><b>Creé un dashboard nuevo. ¿Lo tengo que agregar en todos lados?</b></summary>

No. Los paneles nuevos siguen la política general de *Ajustes*. Con *Mostrarlos*, lo ven todos menos los usuarios o perfiles que lo ocultan. Con *Ocultarlos*, no lo ve nadie hasta que lo permitas.
</details>

<details><summary><b>¿Lo puedo usar junto con Kiosk Mode?</b></summary>

Sí. SK Panel Manager no toca el YAML de los dashboards. Kiosk Mode puede seguir ocultando encabezados en tus tablets hasta que llegue el editor de kiosk propio.
</details>

<details><summary><b>Un usuario sigue viendo un panel que oculté</b></summary>

Revisá la pestaña **Usuarios**: la vista previa muestra el resultado final y cada fila explica qué regla lo decidió. El dueño y (por defecto) los administradores nunca se gestionan. Si las reglas están bien, recargá el navegador de ese usuario.
</details>

## 🗺️ Hoja de ruta

- [x] Motor de reglas con perfiles, dashboard por defecto y orden (0.1)
- [x] Panel visual: resumen, matriz de acceso, usuarios, perfiles, ajustes (0.2)
- [x] Módulo del navegador: bloqueo de la edición de la barra y redirección de paneles ocultos (0.3)
- [ ] **Editor de modo kiosk**: ocultar encabezado, barra, búsqueda, asistente y partes de los diálogos, por usuario, perfil, dispositivo y dashboard
- [ ] **Dispositivos** con nombre ("Tablet cocina") y su propio kiosk
- [ ] **Ver como…**: ver cualquier usuario en cualquier dispositivo y por qué
- [ ] **Importar desde Kiosk Mode**: convertir el YAML `kiosk_mode:` existente en reglas
- [ ] Backup: exportar e importar la configuración

## 🛠️ Desarrollo

```bash
# Demo de la interfaz con un backend simulado (sin Home Assistant)
python3 -m http.server 8766   # y abrí http://localhost:8766/dev/demo.html (?lang=en, ?tab=matrix, ?dark=1)
# Página de prueba del módulo del navegador: http://localhost:8766/dev/runtime.html

# Tests: lógica pura, paridad del resolver JS/Python e integración con un HA real
pip install pytest-homeassistant-custom-component
pytest tests

# Regenerar las capturas del README (necesita Google Chrome y el servidor de arriba)
./dev/shots.sh
```

Estructura: `custom_components/sk_panel_manager/` (motor de reglas, almacenamiento por usuario, API websocket), `frontend/` (panel de administración y módulo del navegador, sin compilación), `brand/` (íconos para HA 2026.3+), `tests/`, `dev/` (demo y páginas de prueba), `docs/` (imágenes y sus fuentes).

Historial de versiones en [CHANGELOG.es.md](https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/CHANGELOG.es.md).

## ☕ Apoyá el proyecto
Si SK Panel Manager te ahorra tiempo (y alguna discusión en casa), podés invitarme un café para que lo siga mejorando. ¡Gracias!

<p align="center"><a href="https://www.paypal.com/donate/?business=gerencia%40skynetcom.com.ar&currency_code=USD&item_name=SK+Panel+Manager"><img src="https://img.shields.io/badge/%E2%98%95%20Invitame%20un%20caf%C3%A9-PayPal-ffdd00?logo=paypal&logoColor=003087&labelColor=ffdd00&style=for-the-badge" alt="Invitame un café"></a></p>

También de SkynetCom: [SK Irrigation Manager](https://github.com/SkynetCom/sk-irrigation-manager-ha), un administrador de riego visual para Home Assistant.

## 📄 Licencia
[MIT](https://github.com/SkynetCom/sk-panel-manager-ha/blob/main/LICENSE)
