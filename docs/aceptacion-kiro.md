# Aceptación en Kiro — AC-19 y AC-20

**Esto no se puede automatizar y no se va a fingir que sí.** Kiro es un IDE y no expone su estado de
contexto; ningún test de este repositorio puede afirmar que _lee_ lo que se le generó. Un test que
simulara esta comprobación sería un verde falso permanente.

Lo que sí está automatizado es la sintaxis (AC-18, `test/kiro.test.mjs`, 7 casos en verde contra el
proyecto de referencia). Que los ficheros existan y tengan la forma correcta **no es que funcionen**.
Esa distinción es la razón de que este documento exista.

## Cómo se rellena

Ejecuta los pasos en orden y **pega la salida real debajo de cada uno**, incluida la de los que
fallen. Un paso fallido documentado vale más que un paso omitido.

De los siete, **tres son los únicos que distinguen «el fichero existe» de «la herramienta lo lee»**:
el 3, el 5 y el 6. Los demás son preliminares — si fallan, los tres que importan no significan nada.

---

## Antes de empezar

```bash
cd ~/projects/one-markdown
: > .harness/skill-usage.jsonl
: > .harness/delegation.jsonl
```

Se vacían los registros a propósito: hay que poder distinguir una línea nueva de una vieja. Medir
sobre un fichero que ya tenía contenido es cómo se dan por buenos ceros y unos que no son de esta
corrida.

Abre el proyecto en Kiro.

---

## Paso 1 · preliminar · ¿carga el método?

**Pregunta en el chat**: `¿qué reglas y skills tienes cargadas ahora mismo?`

**Qué demuestra que funcionó**: nombra el método —especificación antes que código, TDD, contrato de
parada, verificación— y las cuatro skills por su nombre.

**Si falla**: Kiro no está leyendo `AGENTS.md` ni `.kiro/steering/`. Todo lo demás es ruido hasta
arreglarlo.

```
salida:
Aquí está el inventario completo de lo que tengo activo en este momento:

Reglas cargadas

AGENTS.md (workspace) — reglas del proyecto One Markdown: quién hace qué, territorios, convenciones de código, el método.
20-territorio-backend.md
 — aplica a apps/api/**, packages/shared/**
20-territorio-frontend.md
 — aplica a apps/web/**, packages/shared/**
Skills disponibles (declaradas en el sistema, listas para activar bajo demanda)

Skill	Cuándo se activa
spec-driven-development	Antes de planificar cualquier cambio significativo
test-driven-development-tdd	Antes de cualquier implementación
stop-and-report	Al recibir una tarea; si algo no cuadra
verification-and-measurement	Antes de dar por bueno cualquier verde o cifra
react-best-practices	Código React/Next.js
playwright	Tests e2e
clean-ddd-hexagonal	Diseño de dominio/arquitectura backend
testing-anti-patterns	Revisión de tests
prisma-database-setup	Configuración de base de datos
tailwind-css-patterns	Estilos
nestjs-best-practices	Módulos NestJS
typescript-advanced-types	Tipos avanzados TS
accessibility	WCAG/ARIA
composition-patterns	Arquitectura de componentes React
zustand	Estado global frontend
web-design-guidelines	Revisión UI
security-review	Auth, inputs, secretos
Ninguna de las cuatro skills del método está actualmente activada — están disponibles pero se cargan explícitamente cuando el contexto lo requiere. Si me pides implementar algo, activo spec-driven-development + test-driven-development-tdd + stop-and-report antes de escribir una línea.

```

## Paso 2 · preliminar · ¿carga el territorio correcto?

**Abre** `apps/web/src/app/AppShell.tsx`. **Pregunta**: `¿en qué territorio estoy y qué reglas
aplican aquí?`

**Qué demuestra que funcionó**: responde `frontend`, y menciona alguna de sus reglas de la casa
(consultas por nombre accesible, Zustand en slices, objetivos ≥ 24 × 24 px).

```
salida:
Estás en territorio frontend.

El archivo activo es
AppShell.tsx
, que cae dentro de apps/web/**.

Reglas que aplican:

20-territorio-frontend.md
 — reglas específicas de frontend
El paquete packages/shared/** también es territorio frontend (compartido con backend)
Skills que se cargan antes de cualquier trabajo:

Cuándo	Skill
Antes de planificar cualquier cambio	spec-driven-development
Antes de la primera línea de código	test-driven-development-tdd
Al recibir una tarea	stop-and-report
Antes de dar por bueno cualquier resultado	verification-and-measurement
Stack del territorio: React, TypeScript estricto, apps/web/**. El backend (NestJS, auth, DB) no es tu territorio — cualquier cambio que lo toque requiere parar y avisar.

¿Qué quieres hacer?

```

## Paso 3 · **DECISIVO** · ¿el filtro filtra, o está siempre encendido?

**Abre** `apps/api/src/main.ts`. **Pregunta**: `¿en qué territorio estoy y qué reglas aplican aquí?`

**Qué demuestra que funcionó**: responde `backend` **y no menciona nada del territorio de frontend**.

**Por qué es decisivo**: `inclusion: fileMatch` puede fallar de dos maneras y solo una se ve. Si no
carga nunca, el paso 2 ya habría fallado. **Si carga siempre**, el paso 2 pasa igual y nadie se
entera: las reglas de los dos territorios estarían encima en todo momento, y la separación que este
montaje existe para sostener sería decorativa. Este paso es el único que las distingue.

```
salida:
El archivo activo es
main.ts
, que cae bajo apps/api/** — territorio exclusivo del rol backend.

Las reglas que aplican aquí son:

20-territorio-backend.md
 — reglas específicas de backend
Las cuatro skills del método: spec-driven-development, test-driven-development-tdd, stop-and-report, verification-and-measurement
Reglas globales del repo: TypeScript estricto, autorización por userId, JWT/bcrypt/MFA/Passport/Redis en el backend, secretos solo por env vars
packages/shared/** es territorio compartido entre frontend y backend, así que ahí aplicarían ambos conjuntos de reglas territoriales.


```

### ⚠ Los pasos 2 y 3, tal como estaban escritos, **no eran decisivos**

Se descubrió al leer las respuestas, no al diseñarlos. Dos motivos, y los dos son fallos del guion:

1. **`AGENTS.md` contiene la tabla de roles con los dos territorios**, y se carga siempre. Kiro puede
   responder «estás en backend» leyendo solo eso, sin que `fileMatch` haga nada. Comprobado: las
   reglas globales que citó en el paso 3 —TypeScript estricto, autorización por `userId`, JWT— están
   en `AGENTS.md`, no en el steering territorial.
2. **En ninguno de los dos pasos citó contenido exclusivo del steering.** Nombró los ficheros
   —`20-territorio-frontend.md`— pero no dijo nada que solo esté dentro de ellos. Nombrar un fichero
   puede venir de su metadato; no prueba que se haya cargado el cuerpo.

La respuesta del paso 3 es **compatible con que el filtro funcione y también con que no**. Eso no es
un aprobado ni un suspenso: es un instrumento que no discrimina, y darlo por bueno sería el defecto
que la skill de verificación persigue.

---

## Paso 3-bis · **EL DECISIVO DE VERDAD** · contenido exclusivo del territorio

Se apoya en cuatro frases que existen **solo** en `.kiro/steering/20-territorio-frontend.md` y en
ningún fichero que Kiro cargue siempre —verificado con `grep` sobre `AGENTS.md` y sobre el steering de
backend—: «objetivo interactivo ≥ 24 × 24 px», «nombre accesible», «slices por dominio»,
«sanitizada».

**a)** Abre `apps/web/src/app/AppShell.tsx` y pregunta, sin más contexto:

> `¿cuál es el tamaño mínimo de un objetivo interactivo en este proyecto, y por qué las consultas de
> los tests van por nombre y no por contenido?`

**b)** Abre `apps/api/src/main.ts` y pregunta **exactamente lo mismo**.

| Resultado | Qué significa |
|---|---|
| **(a) responde con las dos cosas · (b) dice que no le consta** | `fileMatch` **filtra**. Es el único resultado que lo demuestra. |
| (a) responde · (b) también responde | El steering está **siempre encendido**: la separación de territorios es decorativa. |
| (a) no responde | El steering territorial **no se carga nunca**, y el paso 2 daba un falso positivo. |

```
salida (a) en frontend:


salida (b) en backend:


veredicto:  [ ] filtra   [ ] siempre encendido   [ ] no carga nunca
```

---

## Paso 4 · preliminar · ¿ve los subagentes?

**Comprueba** que `orchestrator`, `frontend` y `backend` aparecen donde Kiro liste sus agentes.

```
salida:
Si aparecen
```

## Paso 5 · **DECISIVO** · ¿honra el modelo? _(resuelve el supuesto R2)_

**Invoca** el subagente `frontend` y pregúntale: `¿con qué modelo estás corriendo?`

**Qué se espera**: `.kiro/agents/frontend.md` declara `model: opus`. rulesync lo escribe; **que Kiro
lo respete es de Kiro, y nunca se ha verificado**.

**Si no lo respeta o no se puede saber**: se retira el campo `kiro-ide` de la tabla `modelos` del
perfil y se documenta como no soportado, **igual que Copilot**. Eso no es un fallo del harness: es
información que no teníamos y que cambia lo que se puede prometer.

```
salida:
respuesta:
veredicto:  [ ] lo honra   [x] NO lo honra   [ ] no se puede saber

Da error porque no reconoce el modelo. Decisión: no especificar modelo en los subagentes de
Kiro; que hereden el de la sesión base.
```

> **R2 RESUELTO, en negativo.** Kiro **no** honra `model:` en un subagente: da error con el valor.
> Es peor que ignorarlo en silencio, porque rompe la sesión en vez de degradarse.
>
> **Aplicado en el harness**: `kiro-ide: {}` en la tabla `modelos` del perfil —bloque vacío, igual
> que Copilot—, de modo que no se le escribe el campo y hereda el de la sesión. Y el test de AC-18
> que afirmaba que **sí** llevaba modelo se ha invertido: ahora comprueba que **no** lo lleva. No es
> debilitar una aserción para que pase; es corregirla contra la evidencia, que es lo que este paso
> existía para producir.
>
> Queda una columna menos en la tabla rol × herramienta. Eso es información que no teníamos, y
> cambia lo que el harness puede prometer.

## Paso 6 · **DECISIVO** · ¿disparan los hooks? _(resuelve el supuesto R1)_

**Pide** al agente que escriba algo trivial en `apps/web/src/` — por ejemplo, un comentario en un
fichero existente. Luego:

```bash
cat .harness/delegation.jsonl
```

**Qué demuestra que funcionó**: aparece una línea. Que el JSON de `.kiro/hooks/rulesync.json` sea
válido ya está comprobado por AC-18; esto es lo único que demuestra que Kiro **lo ejecuta**.

**Mira el campo `_esquema` de esa línea.** Es la sonda, y es el dato que este paso existe para
recoger:

| `_esquema`             | Qué significa                                                        | Qué hacer                                                                       |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `claudecode` o `camel` | El adaptador reconoció el payload de Kiro                            | nada, funciona                                                                  |
| `desconocido`          | Kiro manda otra forma. La línea trae `_claves` con las claves reales | añadir la ruta a `RUTAS` en `instrumentacion/_payload.py` y publicar un _patch_ |

**Lo que no se hace**: rellenar el hueco. Si `agent` sale `null`, es que Kiro no manda quién escribió,
y eso significa **no medible**, no cero. Inventar un `"main"` ahí produciría exactamente el ratio de
delegación falso que costó dos conclusiones equivocadas en la retrospectiva anterior.

```
salida:


_esquema observado:
_claves (si desconocido):
```

## Paso 7 · preliminar · ¿registra las skills?

**Pide** al agente: `invoca la skill stop-and-report`. Luego:

```bash
cat .harness/skill-usage.jsonl
```

```
salida:


```

---

## Veredicto

| #     | Paso                        | Resultado |
| ----- | --------------------------- | --------- |
| 1     | Carga el método             | ✅ nombra `AGENTS.md`, los dos steering y las 17 skills |
| 2     | Carga el territorio         | ⚠ **no concluyente** — nombró el fichero, no citó su contenido |
| **3** | **El filtro filtra**        | ⚠ **no concluyente** — la respuesta se explica igual de bien por `AGENTS.md` |
| **3-bis** | **El filtro filtra (afinado)** | ⬜ pendiente |
| 4     | Ve los subagentes           | ✅ los tres |
| **5** | **Honra el modelo** (R2)    | ❌ **no lo honra: da error.** Aplicado en el harness |
| **6** | **Disparan los hooks** (R1) | ⬜ pendiente |
| 7     | Registra las skills         | ⬜ pendiente |

**Fecha**: 2026-08-03
**Versión de Kiro**:
**Método**: v0.1.0

### Lo que este documento ya ha producido

Un supuesto resuelto en negativo (**R2**) con su cambio aplicado, y **un defecto del propio guion**:
dos pasos que se creían decisivos no discriminaban. Eso segundo vale tanto como lo primero — un
instrumento que no distingue el caso bueno del malo da respuestas que se citan con confianza y no
significan nada.

### Qué cambia en el harness según el resultado

- **Paso 3 falla** → el steering por territorio no sirve en Kiro; hay que decidir si se emite como
  `always` asumiendo el solape, o no se emite.
- **Paso 5 falla** → `kiro-ide` sale de la tabla de modelos y se documenta como degradado.
- **Paso 6 con `_esquema: desconocido`** → se añade la ruta y sube un _patch_ del método. **El paso se
  repite después**: sin repetirlo, lo único demostrado es que se cambió el código.
- **Paso 6 sin línea ninguna** → los hooks no disparan en Kiro. La instrumentación se declara no
  disponible ahí, y `doctor` tendrá que decirlo como _no medible_, nunca como cero.
