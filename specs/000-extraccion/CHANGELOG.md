# 000 · Historial

## 0.1.0 — 2026-08-03

Primera versión. Extracción del harness a repositorio propio, con proyección multi-herramienta y
selección de modelo por rol y herramienta.

Nace de dos fallos medidos en el proyecto de origen, no de una preferencia: una copia manual nunca
recibe una mejora del método, y fuera de una sola herramienta se estaba cargando un método distinto
—dos skills de terceros en lugar de las propias, y otras dos ausentes— sin que nada lo detectara.

Se deja deliberadamente abierta la forma exacta de `showi.yml` hasta el primer render en verde, y sin
detallar las tareas de las tres últimas fases. Fijarlas ahora produciría correcciones que no compran
nada.

Dos supuestos entran sin verificar y están marcados como tales en AC-20: el formato del payload que
Kiro entrega a un hook de comando, y si Kiro respeta el campo de modelo de un subagente. La
documentación de Kiro no responde ni a uno ni a otro.
