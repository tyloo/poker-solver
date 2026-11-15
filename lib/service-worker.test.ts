import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { SKIP_WAITING } from "./app-update";

/** Runs public/sw.js against a stub worker scope and returns its event listeners. */
function loadServiceWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const self = {
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    clients: { claim: vi.fn(() => Promise.resolve()) },
    location: { origin: "https://example.test" },
    skipWaiting: vi.fn(() => Promise.resolve()),
  };
  const caches = { keys: () => Promise.resolve([]), open: () => Promise.resolve({ addAll: () => Promise.resolve() }) };
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  new Function("self", "caches", source)(self, caches);
  const dispatch = (type: string, event: object = {}) => listeners.get(type)?.({ waitUntil: () => {}, ...event });
  return { dispatch, self };
}

describe("service worker updates", () => {
  it("waits after installing instead of taking over the open pages", () => {
    const { dispatch, self } = loadServiceWorker();
    dispatch("install");
    expect(self.skipWaiting).not.toHaveBeenCalled();
  });

  it("takes over when the page asks for the update", () => {
    const { dispatch, self } = loadServiceWorker();
    dispatch("message", { data: "something else" });
    expect(self.skipWaiting).not.toHaveBeenCalled();
    dispatch("message", { data: SKIP_WAITING });
    expect(self.skipWaiting).toHaveBeenCalledOnce();
  });
});
