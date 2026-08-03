# 000 · Tareas

**Versión**: 0.1.0 · Acompaña a `spec.md` 0.1.0 · `plan.md` 0.1.0

Leyenda: `[ ]` pendiente · `[~]` en curso o bloqueada con motivo · `[x]` hecha y verificada.

Cada tarea nombra los ficheros que puede tocar. **Si hace falta uno que no está en la lista, se para y
se avisa** — no se amplía la lista sobre la marcha. Cada `DONE` es un comando que tiene que ejecutar
algo: un comando que no corre nada sale en verde y no significa nada.

---

## Fase 1 · El motor

- [ ] **T-001 · El motor de plantillas interpola, itera e incluye**
  - **RED**: `test/render.test.mjs` — un caso por constructo; falla porque `src/render.mjs` no existe
    todavía. *No vale como RED un fallo de importación por fichero ausente*: se crea `render.mjs`
    exportando la función con cuerpo vacío, y el rojo es de aserción.
  - **Toca**: `src/render.mjs`, `test/render.test.mjs`
  - **DONE**: `node --test test/render.test.mjs`

- [ ] **T-002 · El motor no evalúa código y no tiene condicionales** (D2)
  - **RED**: un caso alimenta la plantilla con una expresión y comprueba que se emite literal, no
    evaluada.
  - **Toca**: `test/render.test.mjs`, `src/render.mjs`
  - **DONE**: `node --test test/render.test.mjs`

- [ ] **T-003 · El esquema de `harness.yml` se valida y falla con el campo que falta**
  - **RED**: un perfil al que le falta un campo obligatorio produce un error que **nombra el campo**;
    falla porque `esquema.mjs` no valida nada.
  - **Toca**: `src/esquema.mjs`, `schema/harness.schema.json`, `test/esquema.test.mjs`
  - **DONE**: `node --test test/esquema.test.mjs`

## Fase 2 · El método como fuente instalable

- [ ] **T-004 · Las skills quedan en el layout que exige `sources`**
  - **RED**: el script de integridad (AC-1, AC-2) corre sobre el repositorio del método y falla si una
    skill de `METODO` no está en `skills/<nombre>/SKILL.md`.
  - **Toca**: `skills/**`, `test/integridad.sh`
  - **DONE**: `bash test/integridad.sh`

- [ ] **T-005 · `rules/metodo.md` existe y no nombra ningún proyecto** (AC-3)
  - **RED**: el patrón de fuga sobre `rules/metodo.md` — falla porque el fichero no existe.
  - **Toca**: `rules/metodo.md`, `test/integridad.sh`
  - **DONE**: `bash test/integridad.sh`

- [ ] **T-006 · Un repositorio desechable instala el método por SHA**
  - **RED**: instalar desde el repositorio del método en un directorio temporal y comprobar AC-1;
    falla mientras no haya remoto publicado. **Bloqueante conocido**: requiere el repositorio
    publicado. Si no lo está, se para y se avisa — no se simula con una copia local, que probaría otra
    cosa.
  - **Toca**: `test/instalacion.sh`
  - **DONE**: `bash test/instalacion.sh`

## Fase 3 · Partir los roles

- [ ] **T-007 · La parte portable de los roles no contiene marcadores** (AC-5)
  - **RED**: la comprobación sobre `templates/roles/_comun/metodo.md` y los `portable.md` falla
    mientras esos ficheros no existan partidos.
  - **Toca**: `templates/roles/**`, `test/plantillas.test.mjs`
  - **DONE**: `node --test test/plantillas.test.mjs`
  - **Nota**: aquí es donde se descubre qué se coló de proyecto en lo que se creía portable. **Cada
    hallazgo se reporta, no se corrige en silencio**: si el método nombra un stack, eso cambia la
    skill, y eso es una decisión, no una tarea.

- [ ] **T-008 · La parte de perfil no contiene prosa de proyecto** (AC-6)
  - **RED**: render con contexto centinela; falla si sobrevive una palabra del proyecto de referencia.
  - **Toca**: `templates/roles/*/perfil.md.tmpl`, `test/plantillas.test.mjs`
  - **DONE**: `node --test test/plantillas.test.mjs`

- [ ] **T-009 · El frontmatter lleva el modelo de cada par rol × herramienta** (AC-8, AC-9)
  - **RED**: un perfil con modelos distintos por herramienta produce el bloque de cada una; y la
    herramienta sin soporte **no** recibe campo de modelo.
  - **Toca**: `templates/roles/*/frontmatter.yml.tmpl`, `test/modelos.test.mjs`
  - **DONE**: `node --test test/modelos.test.mjs`

## Fase 4 · Configuración

- [ ] **T-010 · Las plantillas de configuración salen del perfil**
  - **RED**: renderizar las cuatro plantillas de configuración con el perfil de referencia y comparar
    con el *snapshot*; falla porque no hay plantillas.
  - **Toca**: `templates/config/**`, `test/fixtures/**`, `test/config.test.mjs`
  - **DONE**: `node --test test/config.test.mjs`

- [ ] **T-011 · Las plantillas de spec parametrizan los comandos del proyecto**
  - **RED**: el comando de ejemplo de la plantilla de tareas sale del perfil, no escrito a mano.
  - **Toca**: `templates/specs/**`, `test/config.test.mjs`
  - **DONE**: `node --test test/config.test.mjs`

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
  - **RED**: escribir su `harness.yml`, regenerar y comparar con los ficheros de agente actuales. El
    rojo inicial es el diff completo.
  - **Toca**: en el repositorio de referencia, `harness.yml`; aquí, `test/fixtures/`
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
