# Historial del método

Versiona **el método**, que es lo que un proyecto recibe con `showi update`. La versión del CLI y la
del esquema de `showi.yml` van por su cuenta y no se mezclan: separar las tres es lo que permite
mejorar el método sin obligar a nadie a tocar su perfil.

- **major** — cambia una regla del método, o rompe la forma de `showi.yml`.
- **minor** — skill, puerta o comando nuevo sin romper lo existente.
- **patch** — redacción, una ruta más en la sonda de payload, correcciones que no mueven recuentos.

---

## 0.2.0 — 2026-08-03

Primera versión con el ciclo completo: instalar, sincronizar, diagnosticar y **actualizar**.

### Comandos nuevos

- **`showi doctor`** — el cruce **declarado × presente × habilitado**, que no hacía nadie. En su
  primera ejecución sobre el proyecto de referencia encontró tres servidores MCP que los tres roles
  declaraban obligatorios y estaban apagados en un fichero de configuración local que gana sobre el
  del proyecto y no se ve en un `git diff`. Es el mismo cruce que allí dejó tres skills muertas
  durante siete specs.
- **`showi update`** — la razón de ser de este repositorio. De `showi.yml` cambia **una sola línea**,
  no toca el registro de defectos, y **para si el generado ya estaba divergido a mano** en vez de
  escribir encima.
- **`showi init`** — instala en un repositorio vacío. El perfil nace con marcadores `TODO` y el
  registro de defectos nace vacío: uno relleno con los datos de otro proyecto es peor que uno vacío,
  porque parece configurado.
- **`showi normaliza`** — absorbe las skills publicadas cuyo `name` no coincide con su directorio.
  Casi todas las herramientas se lo tragan; **Kiro aborta la generación entera**.

### Lo que faltaba y ahora está

- Las **reglas del proyecto**: el fichero raíz —`AGENTS.md`, `CLAUDE.md`, `copilot-instructions.md`,
  el steering de Kiro— y las reglas por territorio. **Un solo campo `globs:`** alimenta `paths:`,
  `applyTo:` e `inclusion: fileMatch`. Cinco dialectos, un dato.
- El perfil gana `identidad`, `secciones_casa` —con título e introducción, porque una lista plana
  perdía 28 líneas de reglas de seguridad— y `reporta_ademas`.

### Corregido

- **Los permisos no llegaban a ninguna herramienta.** Faltaba la envoltura `permission` que rulesync
  valida; se rechazaba el fichero entero y el error se perdía entre el resto de la salida.
- **Un bloque de plantilla anidado dentro de sí mismo** emitía su contenido una vez por elemento.
  Ocurrió dos veces, así que ahora hay un guardián sobre todas las plantillas.
- `rulesync.jsonc` se escribía dentro de `.rulesync/`, donde rulesync no lo busca.
- La resolución de rutas del motor caminaba la cadena de prototipos: `{{constructor}}` volcaba el
  código de `Object`.

### Verificado, y lo que no

- **Instalación desde el remoto**, fijada por SHA, con reparto a los seis destinos y el **mismo
  cuerpo del método** en todos. `AC-2` se corrigió al medirlo: byte a byte era inalcanzable porque
  cada herramienta serializa el frontmatter a su manera.
- **Kiro no honra `model:`** en un subagente: da error. `kiro-ide` pasa a bloque vacío en la tabla de
  modelos, igual que Copilot.
- **Sin verificar**: si el filtro por fichero de Kiro filtra de verdad o está siempre encendido, y si
  sus hooks disparan. La instrumentación solo está demostrada en **una** de las seis herramientas.
  Ver `docs/aceptacion-kiro.md`.

### Requisitos operativos que no estaban escritos

- `rulesync install` **necesita `GITHUB_TOKEN`**. Sin él, 60 llamadas por hora y por IP: se agotan
  con una decena de orígenes y falla con 403 **sin instalar ninguno, ni el método**. Parece que el
  origen no existe.
- `showi normaliza` va **entre** instalar y repartir. No es opcional.

---

## 0.1.0 — 2026-08-03

El método extraído a repositorio propio: las cuatro skills sin acoplamiento, la regla raíz, el motor
de plantillas sin lógica, las plantillas de rol partidas en portable y perfil, la configuración y la
instrumentación que **no inventa datos**.
