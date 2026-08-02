# Briefs para sub-agentes — Fases 10-18

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

## Fase 10 — Legibilidad de la burbuja de diálogo
**Costo: S · Sin dependencias · Sin conflicto de archivos con otras fases**

- Subí el `font-size` de `.bubble__text` en `src/ui/styles.css` (hoy 10px) a
  12-13px, y ajustá `min-height`/padding para que no quede apretado.
- Si algún texto de `src/messages/catalog.json` deja de entrar en dos líneas
  al nuevo tamaño, achicá ese texto puntual.
- No toques `.task-item__text` (10px) — eso ya se resolvió aparte con un
  `title` en hover.
- Listo cuando: se ve bien en una captura nativa con un mensaje largo del
  catálogo.

---

## Fase 11 — Exportar e importar datos
**Costo: S/M · Sin dependencias · Comparte `settings-panel.ts` con 12, 13, 14**

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
y `store/preferences.ts` con 11, 13, 14**

- Recordatorio con texto libre + cadencia + fase de anclaje (focus/descanso),
  con su propia pantalla de edición en ajustes — separado de los packs con
  switches que ya existen.
- Tiene que respetar el modo silencio y pasar por el mismo `utter()` central
  que ya usan burbujas/recordatorios — no crear un canal paralelo.
- Toca: `src/core/reminders.ts`, `settings-panel.ts`, `store/preferences.ts`.

---

## Fase 13 — Atajos configurables
**Costo: M · Sin dependencias · Comparte `settings-panel.ts` y
`store/preferences.ts` con 11, 12, 14**

- UI en ajustes para reasignar los atajos existentes (`Ctrl+Alt+G/H/Z`), con
  detección de conflictos entre ellos.
- Riesgo real: re-registrar shortcuts de Tauri en caliente sin dejar el atajo
  viejo "fantasma" si la reasignación falla. Diseñá un flujo de "probar y
  confirmar" antes de persistir el cambio.
- No asumas que un atajo que se registra sin error dispara de verdad (ya hubo
  un caso así por un hook externo) — no hace falta resolverlo, pero el flujo
  de reasignación no debe asumir éxito silencioso.

---

## Fase 14 — Vista previa animada y temas de color nuevos
**Costo: S/M · Depende de la fase 4 (ya hecha) · Comparte `settings-panel.ts`
con 11, 12, 13**

- El selector de personajes en ajustes muestra un loop animado en miniatura
  en vez de solo el nombre.
- Sumá 2-3 paletas de color nuevas, mismo formato que las 3 actuales (dato
  puro en `themes.ts`, sin lógica nueva).
- Cuidado con instanciar un canvas de más por cada personaje listado —
  pensá el costo de render si son varios a la vez.

---

## Fase 15 — Tres personajes nuevos
**Costo: L · Depende de la fase 4 (ya hecha) · Sin conflicto de archivos con
otras fases (carpetas nuevas)**

Tres personajes nuevos en `src/sprites/characters/`, cada uno con su grilla,
sus parches por estado (`idle/focus/rest/celebrate/sleepy`) y pasando el
validador de contrato que ya existe:

1. **Inspirado en el Octocat de GitHub** — NO reproducir el logo real (es
   marca registrada); versión propia "inspirada en" (gato-pulpo genérico),
   familia *criatura*.
2. **Bicho (bug)** — familia *criatura*, más chico, andar propio.
3. **Taza de café humeante** — familia *emblema* (efectos, no anatomía):
   vapor animado, tintineo ocasional.

No toques el motor de sprites/parches — el contrato ya soporta esto.

---

## Fase 16 — Comportamientos más vivos
**Costo: M · Depende de la fase 3 (ya hecha) · Sin conflicto de archivos con
otras fases**

- Más amplitud/variedad en animaciones existentes (parpadeo, caminata,
  estiramiento) y 1-2 conductas nuevas por estado, dentro de la ventana
  actual. NO es deambular libre por el escritorio — eso es la fase 8, aparte
  y en pausa.
- Toca: `src/sprites/behaviors.ts` y los JSON de personajes existentes.
- Mantené duraciones desparejas entre cuadros — cuadros de igual largo laten
  como metrónomo y delatan el bucle.

---

## Fase 17 — Checklist flotante en modo mascota
**Costo: M · Depende de las fases 5 y 9 (ya hechas) · Comparte `widget.ts` y
puede compartir `tasks-panel.ts` con 18 si se hacen en paralelo**

- En modo mascota, un toggle opcional que agrega debajo del personaje+reloj
  una lista compacta de tareas del día (solo tildar hecha, SIN el formulario
  de alta del panel completo).
- El modo mascota hoy encoge la ventana exacto al sprite
  (`resize_keep_center` en `window.rs`). Activar/desactivar la lista debe
  disparar ese mismo recálculo de tamaño.
- Cuidado: ya hay un caso documentado donde un panel abierto + modo mascota
  activado desde afuera del propio botón del panel termina con el overlay de
  hover tapando al personaje — no repetir ese problema con este toggle.
- Toca: `src-tauri/src/window.rs`, `widget.ts`, vista nueva que reusa el
  modelo de `tasks-panel.ts` sin su formulario.

---

## Fase 18 — Secciones de tareas
**Costo: S/M · Depende de la fase 9 (ya hecha) · Comparte `tasks-panel.ts`
con 17 si se hacen en paralelo**

- Campo opcional `section` (texto corto) en `Task`, elegible desde un
  desplegable que reusa secciones ya creadas. El panel de tareas agrupa
  visualmente por sección en vez de lista plana.
- Explícitamente NO: colores, filtros, jerarquía, ni convertir esto en un
  sistema de etiquetas. Una tarea tiene una sección o ninguna.
- Necesita migración defensiva en `store/tasks.ts` para tareas guardadas
  antes de este cambio (sin `section`).
- Si la fase 17 ya existe cuando hagas esta, el checklist flotante también
  debería agrupar por sección. Si no existe todavía, no es tu
  responsabilidad — quien la haga después la actualiza.
