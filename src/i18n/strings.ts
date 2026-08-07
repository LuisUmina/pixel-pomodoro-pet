import type { Language } from "./language";

/**
 * Every static piece of UI chrome the app shows, in both languages. Character
 * badges (DUCK, PULPO...) and voice badges (DEV, HYPE...) stay untranslated
 * on purpose — they read as short codes/icons rather than prose, the same way
 * a percentage chip or "OFF" does, so translating them would not make the
 * app any more readable and would cost every character/voice a second name
 * to keep in sync forever. Dialogue and reminder *content* live in their own
 * bilingual JSON, not here — see `messages/catalog.json` and
 * `messages/reminders.json`.
 */
export const UI_STRINGS = {
  "titlebar.settings": { en: "Settings", es: "Ajustes" },
  "titlebar.theme": { en: "Cycle theme", es: "Cambiar tema" },
  "titlebar.sound": { en: "Toggle sound", es: "Activar/desactivar sonido" },
  "titlebar.ghost": {
    en: "Click-through — press Ctrl+Alt+G to turn it back off",
    es: "Click-through — Ctrl+Alt+G para desactivarlo",
  },
  "titlebar.mini": {
    en: "Mini mode — press Ctrl+Alt+Z to switch back",
    es: "Modo mascota — Ctrl+Alt+Z para volver",
  },
  "titlebar.checklist": { en: "Show task checklist", es: "Mostrar checklist de tareas" },
  "titlebar.hide": {
    en: "Hide — press Ctrl+Alt+H to bring it back",
    es: "Ocultar — Ctrl+Alt+H para volver a mostrarlo",
  },
  "titlebar.close": { en: "Close", es: "Cerrar" },

  "task.placeholder": { en: "what are you working on?", es: "¿en qué estás trabajando?" },
  "task.list": { en: "Task list", es: "Lista de tareas" },
  "task.untitled": { en: "(untitled)", es: "(sin título)" },
  "task.done": { en: "Done", es: "Hecho" },
  "task.delete": { en: "Delete", es: "Eliminar" },
  "task.new": { en: "new task", es: "nueva tarea" },
  "task.estimate": { en: "Estimated pomodoros", es: "Pomodoros estimados" },
  "task.section": { en: "section", es: "sección" },
  "task.sectionHint": { en: "Optional section", es: "Sección opcional" },
  "task.noSection": { en: "no section", es: "sin sección" },

  "controls.start": { en: "START", es: "INICIAR" },
  "controls.pause": { en: "PAUSE", es: "PAUSA" },
  "controls.resume": { en: "RESUME", es: "REANUDAR" },
  "controls.skip": { en: "SKIP", es: "SALTAR" },
  "controls.skipHint": { en: "Skip (Ctrl+Alt+N)", es: "Saltar (Ctrl+Alt+N)" },
  "controls.reset": { en: "RESET", es: "REINICIAR" },
  "controls.resetHint": { en: "Reset (Ctrl+Alt+R)", es: "Reiniciar (Ctrl+Alt+R)" },

  "status.viewHistory": { en: "View history", es: "Ver historial" },
  "status.today": { en: "today", es: "hoy" },
  "status.resize": { en: "Drag to resize", es: "Arrastrá para redimensionar" },

  "settings.title": { en: "settings", es: "ajustes" },
  "settings.focus": { en: "focus", es: "focus" },
  "settings.break": { en: "break", es: "descanso" },
  "settings.longBreak": { en: "long break", es: "descanso largo" },
  "settings.rounds": { en: "rounds", es: "rondas" },
  "settings.roundsUnit": { en: "/cycle", es: "/ciclo" },
  "settings.autoBreaks": { en: "auto-start breaks", es: "iniciar descansos solo" },
  "settings.autoFocus": { en: "auto-start focus", es: "iniciar focus solo" },
  "settings.miniMode": { en: "mini mode", es: "modo mascota" },
  "settings.miniModeHint": {
    en: "Shrink the frame down to just the mascot and the clock",
    es: "Encoge la ventana a solo la mascota y el reloj",
  },
  "settings.size": { en: "size", es: "tamaño" },
  "settings.dim": { en: "dim", es: "opacidad" },
  "settings.dimHint": {
    en: "How opaque the widget stays once a session has been running for a while, unattended",
    es: "Cuán opaco se queda el widget tras un rato sin que lo toques",
  },
  "settings.pet": { en: "pet", es: "mascota" },
  "settings.petPreview": {
    en: "Animated preview of the selected character",
    es: "Vista previa animada del personaje seleccionado",
  },
  "settings.voice": { en: "voice", es: "voz" },
  "voice.dev.hint": { en: "Dry developer humour", es: "Humor seco de programador" },
  "voice.hype.hint": { en: "Encouraging", es: "Alentador" },
  "voice.plain.hint": { en: "Just the facts", es: "Solo los hechos" },
  "voice.medic.hint": { en: "Doctor's orders", es: "Órdenes del doctor" },
  // Reminders ride on the same bubble, so OFF has to take them with it —
  // anything else makes the label a lie. PLAIN is the useful-but-quiet one.
  "voice.off.hint": {
    en: "Nothing at all, reminders included",
    es: "Nada de nada, recordatorios incluidos",
  },
  "settings.language": { en: "language", es: "idioma" },
  "language.en": { en: "EN", es: "EN" },
  "language.es": { en: "ES", es: "ES" },
  "settings.goal": { en: "goal", es: "objetivo" },
  "settings.goalHint": {
    en: "Pomodoros that make a good day, shown next to the tally",
    es: "Pomodoros para un buen día, se muestran junto al contador",
  },
  "settings.reminders": { en: "reminders", es: "recordatorios" },
  "settings.customReminders": { en: "custom reminders", es: "recordatorios propios" },
  "settings.manage": { en: "MANAGE", es: "GESTIONAR" },
  "settings.back": { en: "← BACK", es: "← VOLVER" },
  "settings.shortcuts": { en: "shortcuts", es: "atajos" },
  "settings.quiet": { en: "quiet", es: "silencio" },
  "settings.quietHint": { en: "Silence everything for a while", es: "Silenciar todo por un rato" },
  "settings.backup": { en: "backup", es: "respaldo" },
  "settings.exportData": { en: "EXPORT DATA", es: "EXPORTAR DATOS" },
  "settings.exportDataHint": {
    en: "Export all app data to a JSON file",
    es: "Exportar todos los datos a un archivo JSON",
  },
  "settings.importData": { en: "IMPORT DATA", es: "IMPORTAR DATOS" },
  "settings.importDataHint": {
    en: "Import app data from a JSON file",
    es: "Importar datos desde un archivo JSON",
  },
  "settings.restoreDefaults": { en: "RESTORE DEFAULTS", es: "RESTAURAR VALORES" },
  "settings.exportSuccess": {
    en: "Data exported successfully!",
    es: "¡Datos exportados correctamente!",
  },
  "settings.importSuccess": {
    en: "Data imported successfully!",
    es: "¡Datos importados correctamente!",
  },
  "settings.importInvalidJson": { en: "Invalid JSON file.", es: "Formato JSON inválido." },
  "settings.importNotAnObject": {
    en: "That file's contents are not a valid object.",
    es: "El contenido del archivo no es un objeto válido.",
  },

  "customReminder.message": { en: "message", es: "mensaje" },
  "customReminder.cadenceHint": {
    en: "Every how many minutes",
    es: "Cada cuántos minutos",
  },
  "customReminder.anchorHint": { en: "When to remind you", es: "Cuándo recordarlo" },
  "customReminder.focus": { en: "focus", es: "focus" },
  "customReminder.break": { en: "break", es: "descanso" },
  "customReminder.remove": { en: "Delete reminder", es: "Eliminar recordatorio" },

  "shortcuts.conflict": {
    en: "Conflict: that shortcut is already assigned to another action.",
    es: "Conflicto: atajo duplicado entre funciones.",
  },
  "shortcuts.updateFailed": {
    en: "Couldn't update the shortcut.",
    es: "No se pudo actualizar el atajo.",
  },
  "shortcuts.toggle": { en: "Start / Pause", es: "Iniciar / pausar" },
  "shortcuts.skip": { en: "Skip phase", es: "Saltar fase" },
  "shortcuts.reset": { en: "Reset phase", es: "Reiniciar fase" },
  "shortcuts.ghost": { en: "Click-through", es: "Click-through" },
  "shortcuts.mini": { en: "Mascot mode", es: "Modo mascota" },
  "shortcuts.hide": { en: "Hide / show", es: "Ocultar / mostrar" },

  "phase.focus": { en: "focus", es: "focus" },
  "phase.breaks": { en: "breaks", es: "descansos" },

  "backup.importError": { en: "Error importing data.", es: "Error al importar datos." },

  "history.title": { en: "history", es: "historial" },
  "history.streak": { en: "streak", es: "racha" },
  "history.streakHint": {
    en: "Days in a row with a session. One missed day a week does not break it.",
    es: "Días seguidos con una sesión. Un día perdonado por semana no la rompe.",
  },
  "history.bestStreak": { en: "best streak", es: "mejor racha" },
  "history.bestStreakHint": { en: "Longest streak ever", es: "La racha más larga registrada" },
  "history.total": { en: "total", es: "total" },
  "history.totalHint": {
    en: "Focus sessions completed, all time",
    es: "Sesiones de focus completadas en total",
  },
  "history.bestWeek": { en: "best week", es: "mejor semana" },
  "history.bestWeekHint": { en: "Best 7-day total ever", es: "El mejor total de 7 días" },
  "history.lastYear": { en: "last year", es: "último año" },
  "history.bestDay": { en: "Best day", es: "Mejor día" },
  "history.noSessions": { en: "No sessions logged yet.", es: "Todavía no hay sesiones." },
  "history.session": { en: "session", es: "sesión" },
  "history.sessions": { en: "sessions", es: "sesiones" },

  "tasks.title": { en: "tasks", es: "tareas" },
} as const satisfies Readonly<Record<string, Readonly<Record<Language, string>>>>;

export type UiStringKey = keyof typeof UI_STRINGS;

export function t(key: UiStringKey, language: Language): string {
  return UI_STRINGS[key][language];
}
