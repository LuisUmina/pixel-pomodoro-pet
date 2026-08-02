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
  /** Resizes the native window to match the widget's UI scale. */
  setScale(scale: number): void;
  /** Resizes the native window to an exact size, keeping its centre fixed. */
  resizeKeepCenter(width: number, height: number): void;
  /** Re-registers global hotkeys in the native shell. */
  updateShortcuts(shortcuts: Record<string, string>): Promise<{ success: boolean; error?: string }>;
  notify(title: string, body: string): void;
  hide(): void;
  exportBackup(jsonContent: string): Promise<boolean>;
  importBackup(): Promise<string | null>;
}

const runningInTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function createTauriBridge(): DesktopBridge {
  // Imported lazily so the browser fallback never pulls the Tauri chunks in.
  const core = import("@tauri-apps/api/core");
  const event = import("@tauri-apps/api/event");
  const currentWindow = import("@tauri-apps/api/window");
  const notification = import("@tauri-apps/plugin-notification");
  const dialog = import("@tauri-apps/plugin-dialog");
  const fs = import("@tauri-apps/plugin-fs");

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

    setScale(scale) {
      void core.then((api) => api.invoke("set_widget_scale", { scale }));
    },

    resizeKeepCenter(width, height) {
      void core.then((api) => api.invoke("resize_keep_center", { width, height }));
    },

    async updateShortcuts(shortcuts) {
      const api = await core;
      try {
        await api.invoke("update_shortcuts", { shortcuts });
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: String(err) };
      }
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

    async exportBackup(jsonContent) {
      try {
        const dialogApi = await dialog;
        const fsApi = await fs;
        const filePath = await dialogApi.save({
          defaultPath: "pixel-pomodoro-pet-backup.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });

        if (filePath && typeof filePath === "string") {
          await fsApi.writeTextFile(filePath, jsonContent);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Export backup failed", err);
        return false;
      }
    },

    async importBackup() {
      try {
        const dialogApi = await dialog;
        const fsApi = await fs;
        const filePath = await dialogApi.open({
          multiple: false,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });

        if (filePath && typeof filePath === "string") {
          return await fsApi.readTextFile(filePath);
        }
        return null;
      } catch (err) {
        console.error("Import backup failed", err);
        return null;
      }
    },
  };
}

function createBrowserBridge(): DesktopBridge {
  return {
    available: false,
    on() {},
    setClickThrough() {},
    setScale() {},
    resizeKeepCenter() {},
    updateShortcuts() {
      return Promise.resolve({ success: true });
    },
    notify(title, body) {
      console.info(`[notification] ${title} — ${body}`);
    },
    hide() {},
    async exportBackup(jsonContent) {
      try {
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pixel-pomodoro-pet-backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } catch {
        return false;
      }
    },
    async importBackup() {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };
        input.click();
      });
    },
  };
}

export const desktop: DesktopBridge = runningInTauri
  ? createTauriBridge()
  : createBrowserBridge();
