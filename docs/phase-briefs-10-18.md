# Briefs para sub-agentes — fases pendientes (11, 12, 14, 18)

Las fases 10, 13, 15, 16 y 17 ya se implementaron, auditaron y mergearon a
`main` — sus briefs se sacaron de este archivo. El detalle de cómo quedaron
(incluidos varios bugs reales que la auditoría encontró y ya se corrigieron)
está en `docs/ROADMAP.md`.

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

## Fase 11 — Exportar e importar datos
**Costo: S/M · Sin dependencias · Comparte `settings-panel.ts` con 12, 14**

- Botón en ajustes: volcar historial + tareas + preferencias a un `.json`
  (diálogo de guardado nativo), y otro para cargar uno de vuelta.
- Sumá `@tauri-apps/plugin-dialog` (revisá si hace falta habilitarlo también
  en capabilities de `src-tauri/`).
- El import pasa por la MISMA lectura defensiva que ya usan
  `store/history.ts` y `store/tasks.ts` — no confíes en el archivo que trae
  el usuario.
- Módulo sugerido: `src/store/backup.ts`.
- **Ojo:** ya existe un worktree en Orca llamado `fase_11` — revisalo antes
  de arrancar, puede que ya haya trabajo empezado ahí.

---

## Fase 12 — Recordatorios propios
**Costo: S/M · Depende de la fase 2 (ya hecha) · Comparte `settings-panel.ts`
y `store/preferences.ts` con 11, 14**

- Recordatorio con texto libre + cadencia + fase de anclaje (focus/descanso),
  con su propia pantalla de edición en ajustes — separado de los packs con
  switches que ya existen.
- Tiene que respetar el modo silencio y pasar por el mismo `utter()` central
  que ya usan burbujas/recordatorios — no crear un canal paralelo.
- Toca: `src/core/reminders.ts`, `settings-panel.ts`, `store/preferences.ts`.

---

## Fase 14 — Vista previa animada y temas de color nuevos
**Costo: S/M · Depende de la fase 4 (ya hecha) · Comparte `settings-panel.ts`
con 11, 12**

- El selector de personajes en ajustes muestra un loop animado en miniatura
  en vez de solo el nombre.
- Sumá 2-3 paletas de color nuevas, mismo formato que las 3 actuales (dato
  puro en `themes.ts`, sin lógica nueva).
- Cuidado con instanciar un canvas de más por cada personaje listado —
  pensá el costo de render si son varios a la vez.

---

## Fase 18 — Secciones de tareas
**Costo: S/M · Depende de la fase 9 (ya hecha) · Sin conflicto de archivos
con otras fases pendientes**

- Campo opcional `section` (texto corto) en `Task`, elegible desde un
  desplegable que reusa secciones ya creadas. El panel de tareas agrupa
  visualmente por sección en vez de lista plana.
- Explícitamente NO: colores, filtros, jerarquía, ni convertir esto en un
  sistema de etiquetas. Una tarea tiene una sección o ninguna.
- Necesita migración defensiva en `store/tasks.ts` para tareas guardadas
  antes de este cambio (sin `section`).
- La fase 17 (checklist flotante en modo mascota) ya está en `main` — su
  vista en `src/ui/mini-checklist.ts` también debería agrupar por sección
  para no quedar desactualizada frente al panel completo.
