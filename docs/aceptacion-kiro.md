# Aceptación en Kiro — AC-19 y AC-20

**Esto no se puede automatizar y no se va a fingir que sí.** Kiro es un IDE y no expone su estado de
contexto; ningún test de este repositorio puede afirmar que *lee* lo que se le generó. Un test que
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


```

## Paso 2 · preliminar · ¿carga el territorio correcto?

**Abre** `apps/web/src/app/AppShell.tsx`. **Pregunta**: `¿en qué territorio estoy y qué reglas
aplican aquí?`

**Qué demuestra que funcionó**: responde `frontend`, y menciona alguna de sus reglas de la casa
(consultas por nombre accesible, Zustand en slices, objetivos ≥ 24 × 24 px).

```
salida:


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


```

## Paso 4 · preliminar · ¿ve los subagentes?

**Comprueba** que `orchestrator`, `frontend` y `backend` aparecen donde Kiro liste sus agentes.

```
salida:


```

## Paso 5 · **DECISIVO** · ¿honra el modelo? *(resuelve el supuesto R2)*

**Invoca** el subagente `frontend` y pregúntale: `¿con qué modelo estás corriendo?`

**Qué se espera**: `.kiro/agents/frontend.md` declara `model: opus`. rulesync lo escribe; **que Kiro
lo respete es de Kiro, y nunca se ha verificado**.

**Si no lo respeta o no se puede saber**: se retira el campo `kiro-ide` de la tabla `modelos` del
perfil y se documenta como no soportado, **igual que Copilot**. Eso no es un fallo del harness: es
información que no teníamos y que cambia lo que se puede prometer.

```
salida:
respuesta:
veredicto:  [ ] lo honra   [ ] no lo honra   [ ] no se puede saber
```

## Paso 6 · **DECISIVO** · ¿disparan los hooks? *(resuelve el supuesto R1)*

**Pide** al agente que escriba algo trivial en `apps/web/src/` — por ejemplo, un comentario en un
fichero existente. Luego:

```bash
cat .harness/delegation.jsonl
```

**Qué demuestra que funcionó**: aparece una línea. Que el JSON de `.kiro/hooks/rulesync.json` sea
válido ya está comprobado por AC-18; esto es lo único que demuestra que Kiro **lo ejecuta**.

**Mira el campo `_esquema` de esa línea.** Es la sonda, y es el dato que este paso existe para
recoger:

| `_esquema` | Qué significa | Qué hacer |
|---|---|---|
| `claudecode` o `camel` | El adaptador reconoció el payload de Kiro | nada, funciona |
| `desconocido` | Kiro manda otra forma. La línea trae `_claves` con las claves reales | añadir la ruta a `RUTAS` en `instrumentacion/_payload.py` y publicar un *patch* |

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

| # | Paso | Resultado |
|---|---|---|
| 1 | Carga el método | |
| 2 | Carga el territorio | |
| **3** | **El filtro filtra** | |
| 4 | Ve los subagentes | |
| **5** | **Honra el modelo** (R2) | |
| **6** | **Disparan los hooks** (R1) | |
| 7 | Registra las skills | |

**Fecha**:
**Versión de Kiro**:
**Método**: v0.1.0

### Qué cambia en el harness según el resultado

- **Paso 3 falla** → el steering por territorio no sirve en Kiro; hay que decidir si se emite como
  `always` asumiendo el solape, o no se emite.
- **Paso 5 falla** → `kiro-ide` sale de la tabla de modelos y se documenta como degradado.
- **Paso 6 con `_esquema: desconocido`** → se añade la ruta y sube un *patch* del método. **El paso se
  repite después**: sin repetirlo, lo único demostrado es que se cambió el código.
- **Paso 6 sin línea ninguna** → los hooks no disparan en Kiro. La instrumentación se declara no
  disponible ahí, y `doctor` tendrá que decirlo como *no medible*, nunca como cero.
