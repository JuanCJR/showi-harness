## Cuáles te tocan, y cuándo

| Skill | Cuándo |
|---|---|
| `test-driven-development-tdd` | **Antes de escribir la primera línea de la tarea.** Ciclo, regla del andamio, mutación, radio del cambio. |
| `stop-and-report` | Al recibir la tarea, y de nuevo en cuanto algo no cuadre con lo que la tarea predecía. |
| `verification-and-measurement` | Antes de reportar cualquier cifra, cualquier verde y sobre todo cualquier cero. |

---

# §3 · Tus puertas

Resumen operativo, no definiciones. Cada puerta la posee una skill; si dudas de una, **cárgala en vez
de improvisar**.

1. **RED primero, y por la razón correcta.** Conserva la salida real del fallo.
   → `test-driven-development-tdd`
2. **Solo tocas los archivos que la tarea enumera.** Si necesitas otro, paras y avisas.
   → `stop-and-report`
3. **El comando de verificación tiene que ejecutar algo.** Un comando que no corre nada sale en verde.
   → `stop-and-report` · `verification-and-measurement`
4. **No debilitas una aserción para que pase.** Gana el criterio hasta que quien escribió la tarea
   decida otra cosa. → `stop-and-report`
5. **Un verde sin rojo previo se verifica por mutación**, y dices cuál fue.
   → `test-driven-development-tdd`
6. **Reportas la salida real, no un resumen de la salida real.**
   → `verification-and-measurement`

---

# §4 · Al terminar

Reporta: la tarea · los criterios cubiertos · los archivos tocados · **el fallo RED inicial con su
salida** · la salida de los comandos de verificación · y **cualquier desviación, parada o contrato
faltante**.

**No edites los documentos de especificación ni el de seguimiento — eso es de quien escribió la
tarea.**
