# 000 · Extracción del harness a repositorio propio

**Versión**: 0.1.0 · **Estado**: borrador · **Depende de**: nada

## Por qué

El método —cuatro skills, tres roles, dos hooks de medición— nació dentro de un proyecto y hoy solo
existe ahí. Eso produce dos fallos, y los dos están medidos, no supuestos.

**Fallo 1 · una copia nunca recibe una mejora.** Portar el método significa copiar carpetas a mano.
Cada copia diverge desde el día uno y no hay forma de propagar una corrección a los proyectos que ya lo
usan.

**Fallo 2 · fuera de una sola herramienta se carga otro método.** Medido en el proyecto de origen el
2026-08-03: `.agents/skills/` —la ruta que leen Cursor, Copilot, opencode y Codex— contenía las
versiones de terceros y en inglés de `spec-driven-development` y `test-driven-development-tdd`, y no
contenía `stop-and-report` ni `verification-and-measurement`. El script de limpieza no lo veía porque
solo miraba la ruta de una herramienta. Es el fallo silencioso que el método existe para evitar,
ocurriendo dentro del método.

La causa común es la misma: **no hay una sola fuente**. Esta spec la crea.

## Alcance

**Dentro**: el repositorio del método, con las cuatro skills y las plantillas de rol · un fichero de
perfil por proyecto (`showi.yml`) que rellena lo que cambia entre proyectos · la proyección a las
herramientas destino · la selección de modelo por rol y herramienta · la instrumentación con adaptador
de payload · la verificación de que no hay deriva · la actualización sin perder el perfil.

**Fuera**: reescribir el contenido del método (las cuatro skills se mueven **tal cual**; si al partir
las plantillas aparece método donde no debía, eso es un hallazgo, no un permiso para reescribir) ·
sustituir a rulesync por un emisor propio · las skills de stack, que se declaran pero no se mantienen
aquí.

## Enumeraciones de las que salen los recuentos

Ningún recuento de este documento está escrito a mano; todos salen de estas dos listas.

**`METODO`** — las skills de método: `spec-driven-development` · `test-driven-development-tdd` ·
`stop-and-report` · `verification-and-measurement`.

**`HERRAMIENTAS`** — los destinos activos: `claudecode` · `cursor` · `copilot` · `opencode` ·
`kiro-ide` · `agentsmd`.

**`RUTAS_SKILL`** — dónde busca skills cada destino: `.claude/skills/` · `.cursor/skills/` ·
`.github/skills/` · `.opencode/skills/` · `.kiro/skills/` · `.agents/skills/`.

---

## A · El método llega íntegro a todos los destinos

**AC-1** · Para cada skill de `METODO` y cada ruta de `RUTAS_SKILL` existe `<ruta>/<skill>/SKILL.md`.
*Verifica*: el script de integridad recorre el producto cartesiano de las dos listas y sale 1 a la
primera ausencia. *Mutación que lo tumba*: borrar un directorio de skill de una sola ruta.

**AC-2** · Todas las copias de una misma skill son byte a byte idénticas.
*Verifica*: `sha1sum` de las copias de cada skill, agrupado; más de un hash distinto para una skill
sale 1. *Mutación*: editar una palabra en una sola copia.

**AC-3** · Ninguna skill de `METODO` nombra un proyecto, un stack o un fichero de seguimiento.
*Verifica*: sobre el **cuerpo** de cada `SKILL.md` (excluido el frontmatter, donde `metadata.origin` es
procedencia y no contenido), el patrón de fuga no encuentra coincidencias. *Mutación*: escribir el
nombre de un framework concreto en el cuerpo de una skill.

**AC-4** · La ausencia y la contaminación se reportan distinto y las dos fallan.
*Verifica*: dos ejecuciones del script sobre árboles preparados —uno al que le falta una skill, otro
con una fuga— producen mensajes distintos y las dos salen 1. *Mutación*: tratar la ausencia como
`continue` en vez de como fallo, que es exactamente el defecto que dejó pasar el fallo 2.

## B · El perfil es un dato, no prosa duplicada

**AC-5** · Los ficheros portables de plantilla no contienen marcadores de sustitución.
*Verifica*: los ficheros marcados como portables no contienen la secuencia de apertura de marcador.
*Mutación*: meter un marcador en la parte portable — que es cómo se cuela el proyecto en el método.

**AC-6** · Los ficheros de perfil no contienen prosa sobre ningún proyecto.
*Verifica*: se renderiza el perfil con un contexto centinela cuyos valores son cadenas sin significado,
y en la salida no sobrevive ninguna palabra del proyecto de referencia. *Mutación*: escribir el nombre
de un framework directamente en la plantilla de perfil en vez de pasarlo por un marcador.

**AC-7** · Todo dato del perfil de los roles del proyecto de referencia tiene campo en `showi.yml`.
*Verifica*: regenerar los ficheros de agente del proyecto de referencia desde su `showi.yml` y
comparar con los actuales; la diferencia admisible es reordenación y el enlace del registro de
defectos, nunca pérdida de contenido. *Mutación*: omitir un campo del esquema y ver aparecer un hueco
en el diff. *Nota*: este criterio se verifica **una vez**, contra el proyecto de referencia; es la
prueba de que el esquema es suficiente, no un test de regresión permanente.

## C · El modelo se elige por rol y por herramienta

**AC-8** · Para cada rol y cada herramienta de `HERRAMIENTAS` que admita selección de modelo, el
fichero generado para esa herramienta declara el modelo que `showi.yml` asigna a ese par.
*Verifica*: leer el frontmatter de cada fichero de subagente generado y comparar con la tabla de
`showi.yml`. *Mutación*: cambiar el modelo de un rol en `showi.yml` sin regenerar.

**AC-9** · Una herramienta que **no** admite selección de modelo se declara degradada, y no se le
escribe un campo que ignoraría.
*Verifica*: el diagnóstico nombra la herramienta, el motivo y que es limitación de la herramienta y no
del harness; y el fichero generado para ella no contiene campo de modelo. *Mutación*: escribir el campo
igualmente «por si acaso» — un campo que la herramienta ignora en silencio es peor que su ausencia,
porque hace creer que la elección se aplicó.

## D · La instrumentación no inventa datos

Este grupo es el que más cara sale si falla: la medición es lo que convierte una regla en comprobable,
y una medición inventada produce exactamente el cero falso que costó dos errores en la retrospectiva
anterior.

**AC-10** · Un payload cuyo esquema no se reconoce se registra como no reconocido, con las claves
reales que traía.
*Verifica*: se alimenta el hook con un objeto de forma desconocida; la línea escrita marca el esquema
como desconocido e incluye las claves recibidas. *Mutación*: caer a un esquema por defecto cuando no se
reconoce.

**AC-11** · Un campo que no se puede resolver se escribe como ausente, nunca con un valor por defecto.
*Verifica*: se alimenta el hook con un payload al que le falta el identificador de agente; el campo
correspondiente queda nulo, y en particular **no** toma el valor que tendría el agente principal.
*Mutación*: rellenar con el valor más probable — así es como un ratio de delegación pasa a medir la
imaginación del adaptador en vez de la realidad.

**AC-12** · Un hook nunca rompe la llamada que observa.
*Verifica*: se alimenta cada hook con entrada inválida —no-JSON, vacía, y JSON de tipo inesperado— y en
los tres casos termina con código 0. *Mutación*: dejar que una excepción se propague.

## E · Sin deriva

**AC-13** · Editar a mano cualquier fichero generado se detecta.
*Verifica*: se modifica un generado y la comprobación de deriva sale 1; se restaura y sale 0.
*Mutación*: comparar solo la existencia de los ficheros y no su contenido.

**AC-14** · Un `showi.yml` cambiado sin regenerar se detecta.
*Verifica*: se cambia un valor del perfil sin regenerar y la comprobación sale 1. *Mutación*: cachear
el resultado de la comprobación entre ejecuciones.

## F · Se instala y se actualiza sin perder lo del proyecto

**AC-15** · La instalación en un repositorio vacío deja un harness completo.
*Verifica*: sobre un directorio recién inicializado, tras la instalación se cumplen AC-1 y AC-2.
*Mutación*: que la instalación dependa de un fichero que solo existe en el proyecto de referencia.

**AC-16** · Una actualización del método no toca el perfil ni el registro de defectos del proyecto.
*Verifica*: se anota el hash de `showi.yml` y del registro de defectos, se actualiza a una versión
del método con contenido distinto, y los dos hashes coinciden. *Mutación*: regenerar el registro de
defectos desde la plantilla — que es justo lo que borraría lo más caro de reconstruir que tiene un
proyecto maduro.

**AC-17** · Una actualización se niega a escribir sobre un generado ya divergido a mano.
*Verifica*: se diverge un generado, se lanza la actualización y esta para sin escribir, nombrando el
fichero. *Mutación*: sobreescribir sin comprobar. Es el contrato de parada aplicado a la herramienta
que lo distribuye.

## G · Kiro

**AC-18** · La sintaxis de lo generado para Kiro es válida.
*Verifica*: cada regla de dirección con inclusión por coincidencia de fichero declara su patrón; cada
regla de inclusión automática declara nombre y descripción; el fichero de hooks declara su versión y
solo dispara sobre eventos del conjunto documentado; cada skill cumple el estándar de skills —nombre
igual al directorio, y descripción presente—. *Mutación*: emitir una inclusión por coincidencia sin
patrón, que Kiro cargaría siempre en vez de nunca.

**AC-19 · DECLARADO NO AUTOMATIZABLE** · Kiro **lee** lo generado y se comporta en consecuencia.

Ningún test de este repositorio puede cubrirlo: Kiro es un IDE y no expone su estado de contexto. Se
verifica con un guion manual escrito, cuya evidencia se pega en el documento de aceptación. De sus
pasos, **tres** son los que distinguen «el fichero existe» de «la herramienta lo lee», y son los únicos
que cuentan como evidencia:

1. Abrir un fichero del territorio de un rol y preguntar el territorio: responde ese rol **y no
   menciona el del otro** — prueba que la inclusión por coincidencia filtra y no está siempre
   encendida.
2. Pedir la invocación de una skill de `METODO`: aparece la línea correspondiente en el registro de uso
   de skills.
3. Pedir una escritura en territorio: aparece la línea correspondiente en el registro de delegación —
   prueba que el hook **dispara**, no solo que su JSON es válido.

No se escribirá ningún test que simule esta verificación. Un test que finge una comprobación manual es
un verde falso permanente.

**AC-20** · Los supuestos sobre Kiro que hoy no están verificados se resuelven antes de dar la spec por
cerrada, y su resultado se escribe **aunque sea negativo**: el formato del payload que Kiro entrega a
un hook de comando, y si Kiro respeta el campo de modelo de un subagente. Si alguno resulta no
soportado, se documenta como degradado —igual que en AC-9— y se retira de la tabla.
*Verifica*: el documento de aceptación contiene una respuesta con evidencia para cada uno de los dos.
*Mutación*: dar por bueno lo que la documentación no dice.

---

## Lo que ningún test de este repositorio puede cubrir

Declarado aquí para que nadie lo cuente como cobertura ni escriba un test que lo simule:

- **AC-19** y **AC-20** — el comportamiento real de Kiro. Guion manual con evidencia pegada.
- El comportamiento real de las otras herramientas destino. Se cubre con el mismo modo sonda de AC-10:
  no se afirma que funcionan hasta que hay una línea de registro con esquema reconocido.

## Preguntas abiertas

1. ¿El proyecto de referencia consume el método por tag fijo o por rama? Afecta a si una mejora llega
   sola o requiere un acto explícito. *Se cierra antes de derivar tareas del grupo F.*
2. ¿Los ficheros generados se comprometen al repositorio del consumidor? Decidido que sí en el plan,
   con su alternativa descartada; queda abierto el coste real en ruido de diffs, medible solo con un
   par de cambios del método encima.
