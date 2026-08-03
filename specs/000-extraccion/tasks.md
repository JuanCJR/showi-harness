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

- [~] **T-006 · Un repositorio desechable instala el método por SHA** · **BLOQUEADA**: no hay
      remoto publicado. No se simula con una copia local — probaría otra cosa. Espera a
      `JuanCJR/showi-harness` en GitHub.
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

- [ ] **T-012 · Un payload desconocido se marca como desconocido con sus claves** (AC-10)
  - **RED**: alimentar el adaptador con una forma desconocida; la línea escrita lo marca y adjunta las
    claves. Falla porque `_payload.py` no existe.
  - **Toca**: `instrumentacion/_payload.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`

- [ ] **T-013 · Un campo irresoluble queda nulo, nunca por defecto** (AC-11)
  - **RED**: payload sin identificador de agente; el campo es nulo y **no** toma el valor del agente
    principal. Este es el caso que la retrospectiva anterior enseñó a temer.
  - **Toca**: `instrumentacion/_payload.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`

- [ ] **T-014 · Los hooks salen 0 ante entrada inválida** (AC-12)
  - **RED**: tres entradas inválidas —no-JSON, vacía, tipo inesperado— por cada hook.
  - **Toca**: `instrumentacion/*.py`, `test/payload.test.py`
  - **DONE**: `python3 -m unittest test.payload_test -v`

- [ ] **T-015 · `sync` y `check` funcionan de punta a punta** (AC-13, AC-14)
  - **RED**: sobre el fixture, `sync` produce los destinos y `check` sale 0; tocar un generado a mano
    pone `check` a 1.
  - **Toca**: `src/cli.mjs`, `test/cli.test.mjs`
  - **DONE**: `node --test test/cli.test.mjs`

## Fase 6 · El proyecto de referencia

- [ ] **T-016 · El perfil del proyecto de referencia reproduce sus roles actuales** (AC-7)
  - **RED**: escribir su `showi.yml`, regenerar y comparar con los ficheros de agente actuales. El
    rojo inicial es el diff completo.
  - **Toca**: en el repositorio de referencia, `showi.yml`; aquí, `test/fixtures/`
  - **DONE**: diff revisado línea a línea; la única diferencia admisible es reordenación y el enlace
    del registro de defectos.
  - **Nota**: verificación **de una vez**, no de regresión (ver AC-7).

## Fase 7 · Limpieza

- [ ] **T-017 · Una sola fuente para las skills en el proyecto de referencia** (AC-1..AC-4)
  - **RED**: el script de integridad sobre las rutas de `RUTAS_SKILL` del proyecto de referencia falla
    **hoy** — es el fallo 2 de la spec, y su rojo inicial es la prueba de que el defecto existía.
    Conservar esa salida.
  - **Toca**: en el repositorio de referencia: el lock obsoleto y las copias contaminadas
  - **DONE**: `bash test/integridad.sh` sobre el proyecto de referencia

## Fase 8 · Kiro

- [ ] **T-018 · La sintaxis de lo generado para Kiro es válida** (AC-18)
  - **RED**: las cuatro comprobaciones del criterio sobre el árbol generado.
  - **Toca**: `test/kiro.test.mjs`
  - **DONE**: `node --test test/kiro.test.mjs`

- [ ] **T-019 · Guion de aceptación manual en Kiro, con evidencia pegada** (AC-19)
  - **No lleva test.** Es la verificación declarada no automatizable. Se escribe el guion, se ejecuta a
    mano y se pega la salida real, incluida la de los pasos que fallen.
  - **Toca**: `docs/aceptacion-kiro.md`
  - **DONE**: el documento contiene los tres pasos que distinguen «existe» de «se lee», con su
    evidencia.

- [ ] **T-020 · Resolver los dos supuestos no verificados sobre Kiro** (AC-20)
  - **RED**: el modo sonda de T-012 aplicado a Kiro; y comprobar si respeta el campo de modelo.
  - **Toca**: `docs/aceptacion-kiro.md`, y `instrumentacion/_payload.py` si la sonda revela el esquema
  - **DONE**: el documento responde a los dos **con evidencia, aunque la respuesta sea negativa**. Si
    alguno resulta no soportado, se retira de la tabla y se documenta como degradado.

## Fase 9-11 · Puente, CI y publicación

- [ ] **T-021 · Proyección de specs y detección de deriva** (D5)
- [ ] **T-022 · CI: instalación fijada, ausencia de deriva, integridad**
- [ ] **T-023 · `update` no toca el perfil ni el registro de defectos** (AC-16, AC-17)
- [ ] **T-024 · `doctor`: declarado × presente × habilitado**
- [ ] **T-025 · Instalación en un repositorio vacío** (AC-15)

> Las tareas de estas tres fases se detallan al llegar. Escribirlas ahora fijaría formas de datos que
> todavía no existen, que es exactamente el exceso que la skill de SDD manda evitar.
