/** Element lookups that fail loudly instead of producing `null` downstream. */

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`index.html is missing #${id}`);
  }

  return found as T;
}

export function actionElement(action: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-action="${action}"]`);
  if (!found) {
    throw new Error(`index.html is missing [data-action="${action}"]`);
  }

  return found;
}
