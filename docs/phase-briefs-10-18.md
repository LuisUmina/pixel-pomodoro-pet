# Briefs para sub-agentes — fase en curso (12)

Las fases 10, 11 y 13–18 ya se implementaron, auditaron y mergearon a
`main` — sus briefs se sacaron de este archivo. El detalle de cómo quedaron
(incluidos varios bugs reales que la auditoría encontró y ya se corrigieron)
está en `docs/ROADMAP.md`.

La única que queda (12) ya tiene agente asignado y está en revisión tras la
primera vuelta de auditoría — su brief se deja abajo como referencia del
alcance original, no como algo por asignar.

## Preámbulo (pegar antes de CADA fase, a cada sub-agente)

Trabajás en **Pixel Pomodoro Pet**: pomodoro de escritorio (Tauri v2 +
TypeScript) con una mascota pixel-art. Arquitectura:

- `src/core/` — lógica de dominio pura, sin DOM ni Tauri, con tests (vitest).
- `src/store/` — persistencia con **lectura defensiva** (nunca asumas que el
  JSON guardado tiene el shape esperado).
- `src/ui/` — DOM/canvas.
- `src/platform/` — único punto de contacto con la API de Tauri.
- `src-tauri/` — Rust: ventana, bandeja, atajos. Sin lógica de dominio.

Reglas no negociables del proyecto:
- Nada roba el foco del teclado (ya hubo un bug real de esto).
- Todo modo/panel nuevo que pueda dejar el widget inalcanzable nace con su
  atajo de salida.
- Arte y contenido son datos (JSON), no código.
- `core/` se mantiene puro y testeado.
- Todo se puede apagar.

Flujo esperado:
1. Implementá **solo** lo descrito en tu fase. No refactorices ni "mejores"
   código fuera de tu alcance.
2. `npm run typecheck` y `npm test` deben pasar antes de dar por terminado.
3. Commits en Conventional Commits, cuerpo en inglés, texto de UI/docs en
   español — igual que el resto del historial del repo.
4. No hagas push a `main`. Dejá tu rama lista para revisión.
5. Si algo del brief no calza con lo que encontrás en el código, no
   improvises la decisión de diseño: dejalo documentado en el commit y
   avisá.

---

## Fase 12 — Recordatorios propios
**Costo: S/M · Depende de la fase 2 (ya hecha) · Sin conflicto de archivos
con otras fases pendientes**

- Recordatorio con texto libre + cadencia + fase de anclaje (focus/descanso),
  con su propia pantalla de edición en ajustes — separado de los packs con
  switches que ya existen.
- Tiene que respetar el modo silencio y pasar por el mismo `utter()` central
  que ya usan burbujas/recordatorios — no crear un canal paralelo.
- Toca: `src/core/reminders.ts`, `settings-panel.ts`, `store/preferences.ts`.
