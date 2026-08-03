# showi

El método —especificación antes que código, TDD, contrato de parada y verificación— empaquetado para
llevarlo a cualquier proyecto y a cualquier herramienta.

> Paquete `showi-harness`, comando `showi`.

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

## Estado

**En construcción.** La spec `000` está escrita; la implementación no ha empezado. Nada de lo de abajo
funciona todavía, y decir lo contrario sería el tipo de verde falso que este método existe para
impedir.

## Por qué existe

Dos fallos medidos, no supuestos. Una copia manual del método nunca recibe una mejora: diverge desde el
día uno. Y cuando el método vive en la carpeta de una sola herramienta, las demás cargan otra cosa — en
el proyecto de origen, cuatro herramientas estaban leyendo dos skills de terceros en lugar de las
propias, y las otras dos ni siquiera existían para ellas. Nada lo detectó durante siete specs.

Los dos fallos tienen la misma causa: no había una sola fuente.
