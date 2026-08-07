import type { Language } from "./language";
import { UI_STRINGS, type UiStringKey } from "./strings";

/**
 * Re-labels every static piece of chrome marked up with `data-i18n*`
 * attributes. Called once at boot and again whenever the language changes —
 * dynamically-built rows (chips, reminder rows, task rows...) are each
 * responsible for their own re-render instead, since they carry state a
 * blanket DOM walk cannot see.
 */
export function applyLanguage(language: Language, root: ParentNode = document): void {
  document.documentElement.lang = language;

  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    el.textContent = translate(el.dataset["i18n"]);
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    el.title = translate(el.dataset["i18nTitle"]);
  }

  for (const el of root.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")) {
    el.placeholder = translate(el.dataset["i18nPlaceholder"]);
  }

  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", translate(el.dataset["i18nAriaLabel"]));
  }

  function translate(key: string | undefined): string {
    if (!key || !(key in UI_STRINGS)) {
      return "";
    }

    return UI_STRINGS[key as UiStringKey][language];
  }
}
