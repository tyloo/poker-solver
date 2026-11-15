"use client";

import { useEffect, useRef, useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { useI18n } from "@/components/i18n-provider";
import { SKIP_WAITING } from "@/lib/app-update";

/** Registers the offline service worker and offers a refresh when a new version of the app is waiting. */
export function ServiceWorker() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorkerRegistration["waiting"]>(null);
  const updating = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    // The first install also changes the controller; only reload when the user asked for the update.
    const onControllerChange = () => {
      if (updating.current) location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    // An installed app can stay open for days: look for a new version whenever it comes back to the foreground.
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", checkForUpdate);

    container.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registered) => {
      registration = registered;
      // Without a controller this is the first install, not an update.
      const offer = (worker: ServiceWorker | null) => {
        if (worker && container.controller) setWaiting(worker);
      };
      offer(registered.waiting);
      registered.addEventListener("updatefound", () => {
        const worker = registered.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") offer(worker);
        });
      });
    });

    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  if (!waiting) return null;

  const refresh = () => {
    updating.current = true;
    waiting.postMessage(SKIP_WAITING);
    // If the new version has already taken over elsewhere, no controller change arrives.
    setTimeout(() => location.reload(), 3000);
  };

  return (
    <div role="status" className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3">
      <div className="mx-auto flex max-w-[30rem] items-center gap-1 rounded-2xl border-2 border-chalk bg-booth py-1.5 pr-1.5 pl-4">
        <p className="m-0 flex-1 font-bold leading-tight">{t.update.ready}</p>
        <button type="button" className={textButton} onClick={() => setWaiting(null)}>
          {t.update.later}
        </button>
        <button type="button" className={primaryButton} onClick={refresh}>
          {t.update.refresh}
        </button>
      </div>
    </div>
  );
}
