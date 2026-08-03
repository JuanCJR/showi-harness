# 000 · Plan de la extracción

**Versión**: 0.1.0 · Acompaña a `spec.md` 0.1.0

## Arquitectura: tres capas, y la frontera no es arbitraria

| Capa | Qué mueve | Quién | Se fija con |
|---|---|---|---|
| **A · método** | las skills de `METODO` + `rules/metodo.md` | `rulesync install` desde `sources` | `rulesync.lock` (SHA) |
| **B · perfil** | subagentes, reglas del proyecto, hooks, permisos, MCP, plantillas de spec | `showi sync` → escribe `.rulesync/**` | `showi.yml` + tag del método |
| **C · fan-out** | los formatos de `HERRAMIENTAS` | `rulesync generate` | — |

`showi sync` = renderizar B → `rulesync install --frozen` (A) → `rulesync generate` (C).

**La frontera A/B la impone rulesync, no el gusto**: su mecanismo `sources` trae reglas y skills desde
un repositorio remoto, pero **no** trae subagentes, hooks, permisos ni MCP. Todo lo que `sources` no
sabe traer cae en B. Esta es la única razón de que existan dos mecanismos y no uno.

## Decisiones, con lo descartado

### D1 · rulesync como emisor, no un generador propio

**Descartado: escribir los emisores.** Serían unos cientos de líneas para seis formatos que cambian a
menudo, y el mantenimiento recaería aquí cada vez que una herramienta mueva un campo.

**Riesgo asumido**: rulesync lo mantiene una sola persona y evoluciona rápido. Se acota fijando la
versión y capturando la salida como *snapshot*, de modo que subirla enseñe el diff exacto de lo que
cambia. Y se acota estructuralmente: `showi.yml` y las plantillas **no saben nada de rulesync**, así
que sustituir el emisor toca `src/`, no las fuentes.

### D2 · Un motor de plantillas sin lógica

Subconjunto de mustache: interpolación, iteración, bloque-si-vacío, inclusión de parcial y comentario.
**Sin condicionales, sin filtros, sin expresiones.** Si una plantilla necesita lógica, el dato se
precalcula antes y se mete en el contexto.

La razón es la del método: un motor con lógica invita a meter reglas en la plantilla, y las reglas
viven en las skills. La restricción es el mecanismo, no una preferencia estética.

**Descartado: Handlebars/Nunjucks/EJS** — decenas o cientos de kilobytes y su árbol de dependencias
para cinco constructos. **Descartado: plantillas evaluadas como código** (`new Function`) — convierte
un repositorio de método comprometido en ejecución arbitraria en cada sincronización. **Descartado:
sustitución de cadenas a secas** — no soporta listas, y buena parte del perfil son tablas.

### D3 · La separación portable/perfil pasa de comentario a límite de fichero

Hoy el límite es un comentario en mitad del documento (`— SUSTITUIR AL PORTAR`). Un comentario no es
comprobable: nadie falla cuando se cruza.

Después, lo portable y lo del perfil son **ficheros distintos**, y eso hace posibles AC-5 y AC-6: el
fichero portable no puede contener marcadores, y el de perfil no puede contener prosa. Las dos son
comprobaciones mecánicas sobre el fichero entero, no revisiones a ojo sobre una frontera invisible.

### D4 · El registro de defectos vive en el proyecto, nunca se genera

Los ficheros de rol pasan a ser generados. El registro de defectos que hoy vive dentro de ellos es lo
más caro de reconstruir que tiene un proyecto maduro, y una actualización se lo llevaría por delante.

Sale a un documento del proyecto que el harness **jamás escribe** (AC-16), y el rol lo enlaza. Un
proyecto nuevo lo empieza vacío.

**Descartado: generarlo desde `showi.yml`.** Convertiría prosa larga y específica en un campo de
configuración, y volvería a ponerlo en la trayectoria de un `update`.

### D5 · El formato de spec propio es canónico; el de Kiro es proyección de solo lectura

Kiro tiene tres documentos y **no tiene changelog**. El versionado semántico de la spec es una de las
cuatro piezas de la skill de SDD, y vive en el changelog: adoptar el formato de Kiro como canónico
borraría una cuarta parte del método a cambio de compatibilidad con una herramienta de las seis.

**Descartado: convivir con las dos fuentes.** Es la primera regla del registro de defectos —«ningún
requisito vive solo en el plan»— generalizada a documentos enteros: dos documentos con el mismo
requisito y nadie sincronizándolos acaban diciendo dos cosas.

Tres defensas contra que Kiro escriba en la proyección: cabecera de «generado, no editar» en cada
fichero; una regla de dirección siempre activa que declara cuál es la spec canónica; y un hook al
guardar que avisa en el momento.

### D6 · La medición nunca rellena un hueco

Un adaptador prueba varias rutas por campo, y cuando ninguna resuelve escribe ausencia. Cuando no
reconoce el esquema, lo dice y adjunta las claves reales, que es lo que permite añadir la ruta y
publicar un parche.

**Descartado: un valor por defecto razonable.** Un identificador de agente inventado produciría un
ratio de delegación que mide la imaginación del adaptador. Es literalmente el defecto que costó dos
conclusiones falsas en la retrospectiva anterior, y la razón de que existan estos hooks.

### D7 · Lo generado se compromete al repositorio del consumidor

**Descartado: ignorarlo.** Quien clona y abre un IDE sin haber instalado dependencias tendría un
repositorio sin harness — y el harness es justo lo que impide que esa sesión salga mal.

El coste es ruido en los diffs. Se acota marcando los directorios generados como tales para que el
visor los colapse. Queda como pregunta abierta 2 de la spec: el coste real solo se mide con un par de
cambios del método encima.

## Contratos

**`showi.yml`** — el único fichero que escribe una persona, y el único que el harness no sobreescribe
(salvo la línea de versión del método en una actualización, y las migraciones, que muestran el diff
antes de tocar nada). Su forma exacta queda deliberadamente abierta hasta el primer render en verde:
fijarla ahora produciría correcciones que no compran nada.

**Comandos** — `init` (instalar en un repositorio), `sync` (perfil → destinos), `check` (¿hay deriva?),
`update` (traer una versión nueva del método), `doctor` (cruzar declarado × presente × habilitado),
`specs` (proyectar y comprobar el puente).

**`doctor`** merece nombrarse aparte porque implementa como comando una advertencia que hoy solo está
escrita en prosa: *una skill o un servidor apagado en la configuración no se puede invocar aunque un
rol lo declare obligatorio*. Ese cruce es el que dejó tres skills muertas durante siete specs, y nadie
lo hace hoy.

## Orden de construcción y por qué

El camino crítico es: motor de plantillas → partir los roles → el CLI → aplicarlo al proyecto de
referencia → limpieza → Kiro.

**Partir los roles va temprano a propósito.** Es donde se descubre qué se coló de proyecto en la parte
que se creía portable, y ese hallazgo cambia las plantillas. Descubrirlo tarde obligaría a rehacer.

**Kiro va al final y no antes.** AC-19 solo se puede ejecutar sobre un harness completo, y sus dos
supuestos no verificados (AC-20) pueden retirar una columna de la tabla de modelos. Ponerlo antes
sería verificar un instrumento a medio construir.

**El puente de specs es lo único que puede aplazarse** sin bloquear nada más.
