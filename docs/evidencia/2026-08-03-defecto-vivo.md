# El defecto vivo, medido — 2026-08-03

Salida real de `bash test/integridad.sh /home/jc/projects/one-markdown` **antes** de que el harness
tuviera una sola fuente. Es el RED de T-017 y la razón por la que existe este repositorio.

Lo que se lee aquí, en concreto:

- **`.agents/skills/`** —la ruta que leen Cursor, Copilot, opencode y Codex— tenía las versiones de
  terceros de dos skills de método. Las líneas que delatan la fuga son de ellas: hablan de Prisma,
  React y `jest.fn()`. El método no debe pronunciar un stack; al portarlo, miente.
- **`stop-and-report` y `verification-and-measurement` no existían para ninguna herramienta** salvo
  una. Dos de las cuatro reglas del método, ausentes en cinco de seis destinos.
- **Divergencia**: la misma skill con dos contenidos distintos según quién la leyera.

El script anterior no veía nada de esto por dos motivos, y los dos están corregidos en el actual:
**miraba una sola ruta**, y **trataba la ausencia como silencio** en vez de como fallo.

```
Integridad del consumidor (/home/jc/projects/one-markdown)
  ✗ FALTA · .cursor/skills/spec-driven-development/SKILL.md
  ✗ FALTA · .github/skills/spec-driven-development/SKILL.md
  ✗ FALTA · .opencode/skills/spec-driven-development/SKILL.md
  ✗ FALTA · .kiro/skills/spec-driven-development/SKILL.md
  ✗ FUGA · .agents/skills/spec-driven-development/SKILL.md nombra un stack concreto:
      40:3. The database is PostgreSQL (based on existing Prisma schema)
62:   src/components → React components
  ✗ DIVERGE · «spec-driven-development» tiene 2 versiones distintas entre los destinos
  ✗ FALTA · .cursor/skills/test-driven-development-tdd/SKILL.md
  ✗ FALTA · .github/skills/test-driven-development-tdd/SKILL.md
  ✗ FALTA · .opencode/skills/test-driven-development-tdd/SKILL.md
  ✗ FALTA · .kiro/skills/test-driven-development-tdd/SKILL.md
  ✗ FUGA · .agents/skills/test-driven-development-tdd/SKILL.md nombra un stack concreto:
      93:  const mock = jest.fn()
  ✗ DIVERGE · «test-driven-development-tdd» tiene 2 versiones distintas entre los destinos
  ✗ FALTA · .cursor/skills/stop-and-report/SKILL.md
  ✗ FALTA · .github/skills/stop-and-report/SKILL.md
  ✗ FALTA · .opencode/skills/stop-and-report/SKILL.md
  ✗ FALTA · .kiro/skills/stop-and-report/SKILL.md
  ✗ FALTA · .agents/skills/stop-and-report/SKILL.md
  ✗ FALTA · .cursor/skills/verification-and-measurement/SKILL.md
  ✗ FALTA · .github/skills/verification-and-measurement/SKILL.md
  ✗ FALTA · .opencode/skills/verification-and-measurement/SKILL.md
  ✗ FALTA · .kiro/skills/verification-and-measurement/SKILL.md
  ✗ FALTA · .agents/skills/verification-and-measurement/SKILL.md

Problemas: 18 ausencia(s) · 2 fuga(s) · 2 divergencia(s)
```
