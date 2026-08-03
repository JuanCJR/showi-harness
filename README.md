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
| `instrumentacion/` | Los hooks que miden qué skills se usan de verdad y quién escribe el código. |
| `src/` | El CLI. |
| `specs/` | Este repositorio se construye con su propio método. Empieza por [`000-extraccion`](specs/000-extraccion/spec.md). |

## Los comandos

```
showi init                      instalar el harness en un repositorio
showi sync                      showi.yml + el método  →  los seis destinos
showi check                     ¿algún generado ha derivado?           (sale 1 si sí)
showi update                    traer una versión nueva del método
showi doctor                    cruzar declarado × presente × habilitado
showi specs project --to kiro   proyectar las specs al formato de Kiro
```

`doctor` merece nombrarse aparte: implementa como comando una advertencia que hasta ahora solo estaba
escrita en prosa — *una skill o un servidor apagado en la configuración no se puede invocar aunque un
rol lo declare obligatorio*. Ese cruce es el que dejó tres skills muertas durante siete specs, y hoy no
lo hace nadie.

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
