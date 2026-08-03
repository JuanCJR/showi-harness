# showi

El método —especificación antes que código, TDD, contrato de parada y verificación— empaquetado para
llevarlo a cualquier proyecto y a cualquier herramienta.

> Paquete `@showi/harness`, comando `showi`, repositorio `showi-harness`.

Un proyecto declara su perfil en un `showi.yml`. De ahí salen los ficheros que cada herramienta sabe
leer: Claude Code, Cursor, GitHub Copilot, Kiro, opencode y el `AGENTS.md` genérico. **Una sola fuente,
seis destinos** — y el modelo con el que trabaja cada rol en cada herramienta es un campo de ese mismo
fichero.

## Qué hay aquí

| | |
|---|---|
| `skills/` | El método. Cuatro skills que no nombran ningún proyecto ni ningún stack. |
| `rules/` | La raíz del método, la que acaba en `AGENTS.md` y equivalentes. |
| `templates/` | Los roles partidos en dos: lo portable y lo que rellena el perfil. |
| `presets/` | El catálogo de roles. **Arquetipos, no proyectos**: `frontend` dice qué hace ese rol sin nombrar ninguna librería. Añadir uno es dejar un `.yml`. |
| `instrumentacion/` | Los hooks que miden qué skills se usan de verdad y quién escribe el código. |
| `src/` | El CLI. |
| `specs/` | Este repositorio se construye con su propio método. Empieza por [`000-extraccion`](specs/000-extraccion/spec.md). |

## Los comandos

```
showi init                      instalar el harness en un repositorio
showi roles                     qué roles trae el catálogo
showi init . "Mi API" mi-api --roles orchestrator,backend
showi sync                      showi.yml + el método  →  los seis destinos
showi normaliza                 arregla las skills de origen con el nombre mal puesto
showi check                     ¿algún generado ha derivado?           (sale 1 si sí)
showi update                    traer una versión nueva del método
showi doctor                    cruzar declarado × presente × habilitado
```

`doctor` merece nombrarse aparte: implementa como comando una advertencia que hasta ahora solo estaba
escrita en prosa — *una skill o un servidor apagado en la configuración no se puede invocar aunque un
rol lo declare obligatorio*. Ese cruce es el que dejó tres skills muertas durante siete specs, y hoy no
lo hace nadie.

## Instalación

```bash
curl -fsSL https://raw.githubusercontent.com/JuanCJR/showi-harness/main/install.sh | bash
```

Clona el método, instala su dependencia y deja `showi` disponible en cualquier terminal. Si `~/.local/bin`
no está en tu `PATH`, te dice exactamente qué línea añadir y dónde.

**No usa `npm link`**, aunque sea lo habitual: ése instala en el `bin` de la versión de node en uso,
así que un `nvm use` hace desaparecer el comando sin explicación y parece que se desinstaló. El
lanzador que deja no depende de la versión de node, y **apunta al repositorio, no a una copia**: lo
que cambies ahí está disponible al instante.

## Elegir roles

```bash
showi roles                                        # ver el catálogo
showi init . "Mi API" mi-api --roles orchestrator,backend
```

El catálogo son **arquetipos**: `frontend` describe qué hace ese rol —interfaz, estado, navegación,
accesibilidad, tests desde el usuario— **sin nombrar ninguna librería**. Lo que cambia entre
proyectos —el stack, el territorio, los comandos— entra como `TODO` en `showi.yml`, y el perfil
siempre gana.

Un catálogo que nombrara frameworks envejecería con ellos, y el proyecto siguiente tendría que
borrar más de lo que aprovecha. Hay un test y un paso de CI que lo hacen exigible.

**Para añadir un rol**: deja un `.yml` en `presets/`. No hay lista que actualizar.

## La secuencia completa

```bash
export GITHUB_TOKEN=$(gh auth token)
showi sync                       # perfil → .rulesync/ y rulesync.jsonc
npx rulesync@latest install      # trae el método y las skills de terceros, fijados por SHA
showi normaliza                  # ← imprescindible, ver abajo
npx rulesync@latest generate     # reparte a los seis destinos
showi check                      # ¿ha derivado algo?
```

**Por qué `showi normaliza` no se puede saltar.** El estándar de skills exige que el `name` del
frontmatter sea el del directorio. Hay skills publicadas que lo incumplen. Casi todas las herramientas
lo tragan en silencio; **Kiro aborta la generación entera** y deja el árbol a medias con un mensaje
que no dice qué hacer. Este paso lo corrige entre instalar y repartir, y **dice cuál corrigió**. No
toca el origen, así que la comprobación de integridad del lockfile sigue valiendo.

## Antes de instalar

```bash
export GITHUB_TOKEN=$(gh auth token)   # o cualquier token de lectura
```

**No es opcional en cuanto haya más de un puñado de orígenes.** Sin token, la API de GitHub da 60
llamadas por hora y por IP; con una decena de skills de terceros se agotan de una pasada y
`rulesync install` falla con 403 **sin instalar ninguna, ni siquiera el método**. Con token son
5.000/hora. Es la clase de fallo que se diagnostica mal: parece que el origen no existe.

## Estado

**En construcción, con lo que funciona verificado y lo que no, dicho.**

Funciona y está probado de punta a punta contra un proyecto real: `showi sync` y `showi check`, el
motor de plantillas, el validador del perfil, la tabla de modelos por herramienta, la instrumentación,
y la instalación del método desde el remoto con reparto a los seis destinos —comprobado que llega el
**mismo cuerpo** a los seis, no solo que los ficheros existan—.

No existe todavía: `showi init`, `showi update`, `showi doctor`, el puente de specs a Kiro, y la
verificación de que **Kiro lee de verdad** lo generado, que es manual por diseño y está declarada como
no automatizable en la spec.

Estado por tarea en [`specs/000-extraccion/tasks.md`](specs/000-extraccion/tasks.md).

## Por qué existe

Dos fallos medidos, no supuestos. Una copia manual del método nunca recibe una mejora: diverge desde el
día uno. Y cuando el método vive en la carpeta de una sola herramienta, las demás cargan otra cosa — en
el proyecto de origen, cuatro herramientas estaban leyendo dos skills de terceros en lugar de las
propias, y las otras dos ni siquiera existían para ellas. Nada lo detectó durante siete specs.

Los dos fallos tienen la misma causa: no había una sola fuente.
