import type { ShellEvent } from "./events";

/**
 * Everything the UI needs from the desktop shell.
 *
 * Going through an interface keeps the Tauri imports in one file and lets
 * `npm run dev` open the widget in a plain browser, where every call is a
 * no-op instead of a crash.
 */
export interface DesktopBridge {
  /** False when running outside Tauri, e.g. a browser dev session. */
  readonly available: boolean;
  on(event: ShellEvent, handler: () => void): void;
  setClickThrough(enabled: boolean): void;
  notify(title: string, body: string): void;
  hide(): void;
}

const runningInTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function createTauriBridge(): DesktopBridge {
  // Imported lazily so the browser fallback never pulls the Tauri chunks in.
  const core = import("@tauri-apps/api/core");
  const event = import("@tauri-apps/api/event");
  const currentWindow = import("@tauri-apps/api/window");
  const notification = import("@tauri-apps/plugin-notification");

  let notificationsAllowed: Promise<boolean> | null = null;

  async function canNotify(): Promise<boolean> {
    const api = await notification;
    notificationsAllowed ??= api
      .isPermissionGranted()
      .then(async (granted) =>
        granted ? true : (await api.requestPermission()) === "granted",
      )
      .catch(() => false);

    return notificationsAllowed;
  }

  return {
    available: true,

    on(name, handler) {
      void event.then((api) => api.listen(name, () => handler()));
    },

    setClickThrough(enabled) {
      void core.then((api) => api.invoke("set_click_through", { enabled }));
    },

    notify(title, body) {
      void (async () => {
        if (await canNotify()) {
          (await notification).sendNotification({ title, body });
        }
      })();
    },

    hide() {
      void currentWindow.then((api) => api.getCurrentWindow().hide());
    },
  };
}

function createBrowserBridge(): DesktopBridge {
  return {
    available: false,
    on() {},
    setClickThrough() {},
    notify(title, body) {
      console.info(`[notification] ${title} — ${body}`);
    },
    hide() {},
  };
}

export const desktop: DesktopBridge = runningInTauri
  ? createTauriBridge()
  : createBrowserBridge();
