# 000 · Tareas

**Versión**: 0.1.0 · Acompaña a `spec.md` 0.1.0 · `plan.md` 0.1.0

Leyenda: `[ ]` pendiente · `[~]` en curso o bloqueada con motivo · `[x]` hecha y verificada.

Cada tarea nombra los ficheros que puede tocar. **Si hace falta uno que no está en la lista, se para y
se avisa** — no se amplía la lista sobre la marcha. Cada `DONE` es un comando que tiene que ejecutar
algo: un comando que no corre nada sale en verde y no significa nada.

---

## Fase 1 · El motor

- [x] **T-001 · El motor de plantillas interpola, itera e incluye**
  - **RED**: `test/render.test.mjs` — un caso por constructo; falla porque `src/render.mjs` no existe
    todavía. *No vale como RED un fallo de importación por fichero ausente*: se crea `render.mjs`
    exportando la función con cuerpo vacío, y el rojo es de aserción.
  - **Toca**: `src/render.mjs`, `test/render.test.mjs`
  - **DONE**: `npm test` — 16/16. RED previo: 15/16 por aserción, 0 por resolución.
  - **Mutación** del único caso que pasó contra el andamio (`no emite cuando la lista tiene
    elementos`): forzar el bloque invertido a emitir siempre → cae ese caso y solo ese.

- [x] **T-002 · El motor no evalúa código y no tiene condicionales** (D2)
  - **RED**: un caso alimenta la plantilla con una expresión y comprueba que se emite literal, no
    evaluada.
  - **Toca**: `src/render.mjs`, **`test/render-sin-logica.test.mjs`** (desvío, ver abajo)
  - **DONE**: `npm test` — 26/26. RED previo: 5/10 por aserción.
  - **Halló un defecto de T-001**: `resolver` caminaba la cadena de prototipos, así que
    `{{constructor}}` volcaba `function Object() { [native code] }` y `{{toString}}` el método
    heredado. Corregido: solo claves propias. Sin este test, el defecto habría llegado a la
    documentación de las seis herramientas.

- [x] **T-003 · El esquema de `showi.yml` se valida y falla con el campo que falta**
  - **RED**: un perfil al que le falta un campo obligatorio produce un error que **nombra el campo**;
    falla porque `esquema.mjs` no valida nada.
  - **Toca**: `src/esquema.mjs`, `schema/showi.schema.json`, `test/esquema.test.mjs`
  - **DONE**: `npm test` — 36/36. RED previo: 9/10 por aserción.
  - **Mutaciones**: obligatorios invertidos → caen 9 · el vigía de palabras no vigila → cae 1 ·
    solo se reporta el primer problema → cae 1.

### Hallazgo de la fase 5 — un test que no probaba lo que decía

El caso «los hooks salen 0 ante entrada inválida» pasaba **sin la red de seguridad puesta**. Ninguna
de sus entradas llegaba a lanzar una excepción, así que medía otra cosa. Lo descubrió una mutación,
no una revisión: es exactamente para lo que sirve preguntarse «¿qué cambio tumbaría este test?».

Corregido con un caso que sí ejercita la red. Y de paso se corrigió el `DONE` de T-012, que no
ejecutaba nada.

### Desvío de la fase 4

`src/config.mjs` no estaba en los artefactos de T-010. Los cuatro ficheros de configuración son JSON,
y el JSON generado concatenando texto se rompe por una coma. Se construye la estructura en código
—válida por construcción— y la plantilla pone lo único que un serializador no sabe poner: la cabecera
que explica de dónde salió el fichero y que no se edita a mano.

También entra la primera **dependencia de producción**, `yaml`, prevista en el plan: Node no trae
parser y el perfil se escribe en YAML porque se lee más de lo que se escribe.

### Desvío de la fase 3

`src/roles.mjs` no estaba en los artefactos de T-009. Se estrenó porque el frontmatter necesita YAML
anidado por herramienta y el motor no tiene lógica: el dato se precalcula fuera y entra ya resuelto.

### Hallazgo de la fase 2

El modo consumidor del script, corrido contra el proyecto de referencia, mide el defecto que motivó
todo esto: **18 ausencias, 2 fugas y 2 divergencias**. Las fugas son de las skills de terceros que
suplantaban al método y hablan de Prisma, React y `jest.fn()`. Salida completa conservada en
`docs/evidencia/2026-08-03-defecto-vivo.md` — es el RED de T-017.

### Desvíos de la fase 1, declarados

1. **T-002 estrenó `test/render-sin-logica.test.mjs`**, que no estaba en sus artefactos: la tarea
   decía ampliar `test/render.test.mjs`. Se separó a propósito —«qué hace el motor» y «qué
   deliberadamente no hace» son dos preguntas—, pero es un artefacto no declarado y por eso queda
   escrito aquí en vez de pasar callando.
2. **El validador lee `schema/showi.schema.json` en vez de duplicar sus reglas en código.** No estaba
   previsto en la tarea. Se hizo así porque dos definiciones de la misma forma divergen, y de ahí
   sale la propiedad más valiosa del fichero: una palabra de esquema no implementada **estalla** en
   vez de ignorarse, que es lo que impide un esquema que parece estricto y no valida nada.
3. **Se corrigió el script `test` de `package.json`**, que no estaba en los artefactos de ninguna
   tarea. `node --test test/` no corre el directorio: lo resuelve como módulo y muere con
   `MODULE_NOT_FOUND`. Falló ruidosamente, no en falso, pero no ejecutaba ni un caso.
4. **Una comprobación de instrumento mía salió inerte** y hubo que rehacerla: la primera mutación que
   probé no la miraba ningún test, así que «26/26 con la mutación puesta» no probaba nada. Las tres
   que quedan escritas sí matan casos (9, 1 y 2).

## Fase 2 · El método como fuente instalable

- [x] **T-004 · Las skills quedan en el layout que exige `sources`**
  - **Toca**: `skills/**`, `test/integridad.sh`
  - **DONE**: `bash test/integridad.sh` → exit 0, las cuatro presentes con el nombre del directorio.
  - **Sin rojo previo**: las cuatro ya estaban en el layout correcto desde el primer commit. Lo nuevo
    era el instrumento, así que se verifica por mutación — y esas mutaciones **son AC-4**:

    | Mutación | Mensaje | Salida |
    |---|---|---|
    | mover `skills/stop-and-report/` fuera | `FALTA · … «sources» solo descubre skills en <path>/<nombre>/SKILL.md` | 1 |
    | añadir «los tests se corren con vitest» al cuerpo | `FUGA · … nombra un stack concreto` + la línea | 1 |
    | `name:` que no coincide con el directorio | `NOMBRE · … declara «parar-y-avisar» y vive en «stop-and-report»` | 1 |

    Tres modos de fallo, tres mensajes distintos. AC-4 pedía exactamente que la ausencia y la
    contaminación no se confundieran.

- [x] **T-005 · `rules/metodo.md` existe y no nombra ningún proyecto** (AC-3)
  - **Toca**: `rules/metodo.md`, `test/integridad.sh`
  - **RED real**: `FALTA · rules/metodo.md — es la raíz del método, la que acaba en AGENTS.md`, exit 1.
  - **DONE**: `bash test/integridad.sh` → exit 0.

- [x] **T-006 · Un repositorio desechable instala el método por SHA**
  - **Toca**: `test/instalacion.sh`
  - **DONE**: `bash test/instalacion.sh` → exit 0, contra el remoto real. Fuera de `npm test`: pide
    red y depende de un tercero.
  - **Salida real**: `install` fijó `ff41ad3d40aec7ebbbaffdb34d8093b00eeaf0d5` en el lockfile,
    `generate` repartió a siete destinos, y la integridad del árbol dio *«mismo método en 6
    destinos»* para las cuatro skills. El punto de partida era un `git init` vacío, así que cubre
    también AC-15.

  **DOS HALLAZGOS, los dos al ejecutar el fan-out de verdad y ninguno visible leyendo documentación:**

  1. **AC-2 era inalcanzable.** Pedía copias byte a byte idénticas entre destinos y no pueden serlo:
     cada herramienta serializa el frontmatter con sus convenciones de YAML —una pliega la
     descripción, otra la deja en una línea—. Medido: cinco destinos, **tres serializaciones del
     frontmatter y un solo cuerpo**. Caso 3 del contrato de parada, en la spec de este repositorio.
     Corregido en la spec 0.1.1 para hablar del **cuerpo**, que es lo que no puede variar; el
     instrumento se ajustó a la vez. No se debilita: sigue saliendo 1 si el método difiere.
  2. **`agentsmd` no emite skills.** El destino que puebla `.agents/skills/` —la ruta neutral que
     leen Cursor, Copilot, opencode y Codex— es **`agentsskills`**, otro distinto. Sin él, la ruta
     donde estaba el defecto original se habría quedado vacía y nadie lo habría notado hasta abrir
     una de esas herramientas. Añadido a las activas del perfil.
  - **RED**: instalar desde el repositorio del método en un directorio temporal y comprobar AC-1;
    falla mientras no haya remoto publicado. **Bloqueante conocido**: requiere el repositorio
    publicado. Si no lo está, se para y se avisa — no se simula con una copia local, que probaría otra
    cosa.
  - **Toca**: `test/instalacion.sh`
  - **DONE**: `bash test/instalacion.sh`

## Fase 3 · Partir los roles

- [x] **T-007 · La parte portable de los roles no contiene marcadores** (AC-5)
  - **Toca**: `templates/roles/**`, `test/plantillas.test.mjs`
  - **DONE**: `npm test` → 64/64. **Mutación**: meter `{{proyecto.nombre}}` en un `portable.md` →
    cae 1 caso.

  **HALLAZGOS · lo que se había colado en lo declarado portable.** La tarea los anticipaba y por eso
  se reportan en vez de corregirse callando:

  | # | Qué | Dónde estaba | Dónde va ahora |
  |---|---|---|---|
  | 1 | «un test que demuestra que un límite existe no se neutraliza para que la suite pase» | puerta 4 de **solo uno** de los dos implementadores | `reglas_casa` del perfil |
  | 2 | «los DTO de entrada y salida creados · la migración generada (nombre) · qué contratos debe consumir el frontend» | §4 «Al terminar» de **solo uno** de los dos | `reporta_ademas` del perfil, que aterriza en un §5 nuevo |
  | 3 | §2 **no era idéntico entre roles**, como daba por hecho el plan: quien orquesta impone las cuatro skills, quien implementa carga tres | `_comun/metodo.md` único | `_comun/metodo.md` (las cuatro y qué posee cada una, invariante) + la tabla de «cuáles te tocan» en cada `portable.md` |

  Los dos primeros son la prueba de que el límite portable/perfil **no aguanta siendo un comentario**:
  llevaban ahí desde que se escribieron los agentes, en una sola de las dos copias, y nadie lo vio.
  Ahora es un límite de fichero y falla.

  **Decisión que NO se toma aquí y queda para quien dirija**: el hallazgo 1 es candidato a
  generalizarse dentro de la skill `stop-and-report` —«no debilitar una aserción» ya lo cubre, pero
  el caso concreto del límite es buena ilustración—. Cambiar una skill es cambiar el método y sube
  versión, así que de momento se queda como regla de la casa del proyecto.

- [x] **T-008 · La parte de perfil no contiene prosa de proyecto** (AC-6)
  - **Toca**: `templates/roles/*/{perfil,cierre,frontmatter}.*`, `test/plantillas.test.mjs`
  - **DONE**: `npm test` → 64/64.
  - **El test lleva su propio guardián**, porque la comprobación de AC-6 puede pasar **por no haber
    renderizado nada**: un marcador que el centinela no cubre sale vacío y se lleva consigo la prosa
    que lo rodea. El guardián comprueba que el centinela resuelve todos los marcadores, cada uno
    dentro de su bloque. Cazó un `tests_minimos` sin cubrir en su primera ejecución.
  - **Mutaciones**: escribir un stack a mano en `perfil.md.tmpl` → cae 1 · quitar un campo del
    centinela → cae 1.

- [x] **T-009 · El frontmatter lleva el modelo de cada par rol × herramienta** (AC-8, AC-9)
  - **Toca**: `templates/roles/*/frontmatter.yml.tmpl`, `test/modelos.test.mjs`, **`src/roles.mjs`**
    (desvío: no estaba declarado; la plantilla no puede serializar YAML anidado sin lógica, así que
    el bloque se **precalcula**, que es lo que manda D2).
  - **RED**: 8/10 por aserción.
  - **DONE**: `npm test` → 64/64.
  - **Mutaciones**: emitir campos a la herramienta que no admite modelo → caen 2 · iterar la tabla
    en vez de las herramientas activas → caen 3.
  - **Un caso sin mutación que lo mate**: «es determinista». No hay forma de romperlo con el código
    actual; es un guardián contra un cambio futuro, no una medida de hoy. Se deja escrito para no
    contarlo como cobertura.

## Fase 4 · Configuración

- [x] **T-010 · Las plantillas de configuración salen del perfil**
  - **Toca**: `templates/config/**`, `test/fixtures/one-markdown/showi.yml`, `test/config.test.mjs`,
    **`src/config.mjs`** (desvío, ver abajo)
  - **RED**: 19/20, siete por `ENOENT` de plantilla ausente y el resto por aserción.
  - **DONE**: `npm test` → 84/84.
  - **Mutaciones**: ignorar `instrumentacion.habilitada` → cae 1 · emitir MCP no habilitados → cae 1 ·
    traer el método por rama en vez de por tag → cae 1 · resolver la interpolación de entorno de la
    cadena de conexión → cae 1.
  - La mutación de la cadena de conexión merece nombrarse: **resolverla metería una credencial en un
    fichero versionado**, y el test lo impide.

- [x] **T-011 · Las plantillas de spec parametrizan los comandos del proyecto**
  - **Toca**: `templates/specs/**`, `test/config.test.mjs`
  - **DONE**: `npm test` → 84/84.
  - **Mutación**: escribir a mano el comando de ejemplo en `tasks.md.tmpl` → caen 2. El segundo caso
    es el que importa: comprueba que **cambiar el perfil cambia el comando**. Sin él, un comando
    escrito a mano que casualmente coincida con el del perfil pasaría igual.

## Fase 5 · Instrumentación y CLI

- [x] **T-012 · Un payload desconocido se marca como desconocido con sus claves** (AC-10)
  - **RED**: alimentar el adaptador con una forma desconocida; la línea escrita lo marca y adjunta las
    claves. Falla porque `_payload.py` no existe.
  - **Toca**: `instrumentacion/_payload.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`
  - **DONE**: `npm test` (corre las dos suites). **La tarea decía `python3 -m unittest
    test.payload_test`, que no ejecuta nada**: falla con error de módulo. Caso 2 del contrato de
    parada, en la propia lista de tareas. La que corre es `discover -s test -p 'test_*.py'`.
  - **Mutaciones**: la sonda no adjunta las claves → caen 2 · todo esquema se da por conocido →
    caen 4.

- [x] **T-013 · Un campo irresoluble queda nulo, nunca por defecto** (AC-11)
  - **RED**: payload sin identificador de agente; el campo es nulo y **no** toma el valor del agente
    principal. Este es el caso que la retrospectiva anterior enseñó a temer.
  - **Toca**: `instrumentacion/_payload.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`
  - **DONE**: `npm test`.
  - **Mutación**: rellenar `agent` con `"main"` cuando no viene → caen 3, y `npm test` sale 1.
    Es la mutación que reproduce el defecto original: el ratio de delegación pasaría a medir al
    adaptador en vez de al repositorio.

- [x] **T-014 · Los hooks salen 0 ante entrada inválida** (AC-12)
  - **RED**: tres entradas inválidas —no-JSON, vacía, tipo inesperado— por cada hook.
  - **Toca**: `instrumentacion/*.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`
  - **DONE**: `npm test`.
  - **El primer test de esta tarea no probaba lo que decía.** Quitar el `try/except` de un hook lo
    dejaba verde: ninguna de las entradas llegaba a lanzar, porque el adaptador ya se traga los
    errores de JSON por dentro. Lo descubrió la mutación, no la revisión. Se añadió un caso con el
    destino apuntando a un fichero en vez de a un directorio —escribir ahí sí lanza— y con un
    payload de ruta **relativa**, porque con una absoluta de otro árbol el vigía de delegación sale
    antes de llegar al punto que puede fallar.
  - **Mutación**: quitar la red de seguridad de cualquiera de los dos hooks → cae 1 en cada caso.

- [x] **T-015 · `sync` y `check` funcionan de punta a punta** (AC-13, AC-14)
  - **RED**: sobre el fixture, `sync` produce los destinos y `check` sale 0; tocar un generado a mano
    pone `check` a 1.
  - **Toca**: `src/cli.mjs`, `test/cli.test.mjs`
  - **DONE**: `node --test test/cli.test.mjs`
  - **DONE**: `npm test` → 96 casos JS + 14 Python.
  - **`sync` y `check` derivan de la misma función.** Si cada uno construyera lo suyo acabarían
    discrepando, y el que diría que todo está bien sería el `check`.
  - **Mutación**: que `check` compruebe existencia y no contenido → caen 3. Es la mutación obvia y
    la que deja pasar justo el caso que importa: alguien editó el generado a mano y sigue ahí.

## Fase 6 · El proyecto de referencia

- [x] **T-016 · El perfil del proyecto de referencia reproduce sus roles actuales** (AC-7)
  - **Toca**: en el repositorio de referencia, `showi.yml`; aquí, `test/fixtures/`, plantillas de rol,
    `src/cli.mjs`, `test/plantillas.test.mjs`
  - **DONE**: comparación **a nivel de palabra** entre el §1 de cada agente actual y el generado. No
    línea a línea: el texto se reajusta al pasar por el perfil y un diff de líneas no distingue un
    reajuste de una pérdida.
  - **Resultado**: cero pérdidas. Lo que no aparece en el generado es, en los tres roles, deliberado:
    los marcadores `SUSTITUIR AL PORTAR` y el bloque de portabilidad (sobran en un fichero generado),
    `.claude/settings.json` desacoplado a «la configuración», y `find-docs`.

  **CUATRO HALLAZGOS. El esquema se quedaba corto en tres sitios y había un defecto en el motor:**

  | # | Qué faltaba | Cómo se arregló |
  |---|---|---|
  | 1 | El párrafo de **identidad** del rol («Eres el…») no tenía campo | campo `identidad` |
  | 2 | El backend tiene **dos secciones con título propio** —«Regla dura: DTO» y «Seguridad y datos»—; el esquema solo daba una lista plana de reglas, y se perdían **28 líneas** de reglas de seguridad | `reglas_casa` → `secciones_casa: [{titulo, intro, reglas}]` |
  | 3 | Los números de caso de las puertas (`caso 1`, `caso 2`) se habían caído al partir lo portable | restaurados |
  | 4 | **`reporta_ademas` se renderizaba tres veces**: anidé un bloque con el mismo nombre dentro de sí mismo y el motor conserva el contexto de fuera, así que la lista interna se repetía una vez por elemento | bandera `tiene_extras` precalculada, que es lo que D2 manda cuando una plantilla necesitaría lógica |

  **Y un defecto del proyecto de referencia, no del harness**: `frontend.md` y `backend.md` declaran
  obligatoria una skill **`find-docs` que no existe**, y llevan siete specs haciéndolo. Es el cruce
  declarado × presente que `doctor` (T-024) existe para hacer. No se restaura: era el defecto.

## Fase 7 · Limpieza

- [x] **T-017 · Una sola fuente para las skills en el proyecto de referencia** (AC-1..AC-4)
  - **RED conservado**: `18 ausencia(s) · 2 fuga(s) · 2 divergencia(s)`, salida completa en
    `docs/evidencia/2026-08-03-defecto-vivo.md`.
  - **DONE**: `bash test/integridad.sh <proyecto>` → **«Sin problemas»**, las cuatro skills con el
    mismo cuerpo en los seis destinos. Y `showi check` → sin deriva.
  - Se borró `skills-lock.json`: registraba 15 skills donde había 17 y apuntaba a orígenes que el
    método propio ya había reemplazado. Lo sustituye `rulesync.lock`, con SHA e integridad.

  **CUATRO DEFECTOS, y ninguno se veía sin generar de verdad los 84 ficheros:**

  1. **Los permisos no llegaban a ninguna herramienta.** rulesync espera el fichero envuelto en
     `permission`; se emitía pelado y lo rechazaba entero. Los `deny` de secretos y de `git push`
     no estaban puestos en ningún sitio, y el error se perdía entre el resto de la salida. La forma
     correcta se aprendió **importando desde una configuración real**, no adivinando.
  2. **«Reglas de código» salía cinco veces** en el fichero raíz — el mismo bloque anidado consigo
     mismo que ya había corregido en la plantilla de cierre, repetido en otra escrita después.
     Ahora hay un **guardián sobre todas las plantillas**: cometerlo dos veces significa que
     arreglarlo no basta.
  3. **`sync` escribía `rulesync.jsonc` dentro de `.rulesync/`** y rulesync lo busca en la raíz.
  4. **Faltaban las reglas del proyecto**: nada generaba el fichero raíz ni los globs por
     territorio. Un solo campo `globs:` alimenta ahora `paths:`, `applyTo:` e `inclusion: fileMatch`.

  **Y dos requisitos operativos que no estaban escritos**: `rulesync install` necesita
  `GITHUB_TOKEN` —sin él, 403 y no instala **ninguno**, ni el método—, y `showi normaliza` tiene
  que correr entre instalar y repartir, porque hay skills publicadas cuyo `name` no coincide con su
  directorio y **Kiro aborta la generación entera** por eso.

## Fase 8 · Kiro

- [x] **T-018 · La sintaxis de lo generado para Kiro es válida** (AC-18)
  - **Toca**: `test/kiro.test.mjs`
  - **DONE**: `SHOWI_PROYECTO=<ruta> node --test test/kiro.test.mjs` → 7/7 contra el proyecto real.
  - **Sin proyecto generado los casos se saltan**, no pasan: un test que da verde sin nada que mirar
    es peor que no tenerlo.
  - **Mutaciones**: `fileMatch` sin patrón —que haría cargar la regla **siempre** en vez de nunca—
    → cae 1 · un hook apuntando a un script ausente → cae 1.
  - Cubre además dos cruces que nadie hacía: que cada skill cumpla `name` == directorio (lo que hace
    abortar a Kiro), y que los scripts que la configuración de hooks nombra **existan** — uno que no
    existe no falla, simplemente no mide, y ese silencio se lee como un cero.

- [~] **T-019 · Guion de aceptación manual en Kiro** (AC-19) · **PARCIAL Y APARCADO por decisión**
      del 2026-08-03. `docs/aceptacion-kiro.md`.

  **Verificado**: carga el método y los ficheros de steering (paso 1) · ve los tres subagentes
  (paso 4) · **no honra `model:`** (paso 5, R2 resuelto en negativo y aplicado en el harness).

  **NO verificado, y no se cuenta como cubierto**: si `inclusion: fileMatch` **filtra de verdad** o
  está siempre encendido (paso 3-bis) · si los hooks **disparan** en Kiro y con qué forma de payload
  (paso 6, **R1 sigue abierto**) · si registra las invocaciones de skill (paso 7).

  **Consecuencia, dicha en voz alta**: de las seis herramientas, la instrumentación solo está
  demostrada en una. Para las otras cinco —Kiro incluida— `doctor` debe reportar *no medido*, que
  **no es lo mismo que cero**. Esa distinción es el motivo por el que existen estos hooks.

- [~] **T-020 · Resolver los dos supuestos no verificados sobre Kiro** (AC-20) · **uno sí, uno no**.
      R2 (¿honra el modelo?) resuelto en negativo y aplicado. **R1 (¿qué payload manda a un hook?)
      sigue abierto**: necesita el paso 6, que requiere abrir Kiro.

- [ ] ~~T-020 original~~
  - **RED**: el modo sonda de T-012 aplicado a Kiro; y comprobar si respeta el campo de modelo.
  - **Toca**: `docs/aceptacion-kiro.md`, y `instrumentacion/_payload.py` si la sonda revela el esquema
  - **DONE**: el documento responde a los dos **con evidencia, aunque la respuesta sea negativa**. Si
    alguno resulta no soportado, se retira de la tabla y se documenta como degradado.

## Fase 9-11 · Puente, CI y publicación

- [ ] **T-021 · Proyección de specs y detección de deriva** (D5)
- [ ] **T-022 · CI: instalación fijada, ausencia de deriva, integridad**
- [ ] **T-023 · `update` no toca el perfil ni el registro de defectos** (AC-16, AC-17)
- [x] **T-024 · `doctor`: declarado × presente × habilitado**
  - **Toca**: `src/doctor.mjs`, `src/cli.mjs`, `test/doctor.test.mjs`
  - **RED**: 10/11 por aserción. **DONE**: `npm test` → 131/131.
  - **Encontró el defecto en su primera ejecución sobre el proyecto real**: tres servidores MCP
    —`context7`, `coderag`, `postgres`— que **los tres roles declaran obligatorios** y que están
    apagados en `.claude/settings.local.json`, un fichero que **gana sobre el del proyecto y no está
    en el repositorio**. Es exactamente el cruce que dejó tres skills muertas durante siete specs.
  - **Los avisos no hacen fallar el comando, solo los errores.** Degradado no es roto y no medido no
    es cero; si un aviso saliera con 1, se acabarían silenciando todos y con ellos los errores.
  - **La distinción que justifica el comando entero**: sin registro dice «no medido — que no es lo
    mismo que cero». Un cero de un instrumento desconectado se cita con la misma confianza que uno
    real, y esa confusión costó dos conclusiones falsas.
- [ ] **T-025 · Instalación en un repositorio vacío** (AC-15)

> Las tareas de estas tres fases se detallan al llegar. Escribirlas ahora fijaría formas de datos que
> todavía no existen, que es exactamente el exceso que la skill de SDD manda evitar.
