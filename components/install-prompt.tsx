"use client";

import { useEffect, useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { useI18n } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { type InstallPlatform, installPlatform, isDismissed, markDismissed } from "@/lib/install-prompt";

/** Chrome's `beforeinstallprompt` event, which isn't in the DOM types. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    /** Kept by INSTALL_EVENT_SCRIPT when Chrome offers installation before hydration. */
    __installEvent?: InstallEvent;
  }
}

const DELAY_MS = 5000;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Invites phone visitors to add the app to their home screen, a few seconds in, until they dismiss it once. */
export function InstallPrompt() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const found = installPlatform({ maxTouchPoints: navigator.maxTouchPoints, standalone, userAgent: navigator.userAgent });
    if (!found || isDismissed(storage())) return;

    setInstallEvent(window.__installEvent ?? null);
    const onInstallEvent = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => {
      markDismissed(storage());
      setPlatform(null);
    };
    addEventListener("beforeinstallprompt", onInstallEvent);
    addEventListener("appinstalled", onInstalled);

    let timer: number;
    const show = () => {
      // Wait while another sheet is open rather than stacking on top of it.
      if (document.querySelector("dialog[open]")) timer = window.setTimeout(show, DELAY_MS);
      else setPlatform(found);
    };
    timer = window.setTimeout(show, DELAY_MS);

    return () => {
      clearTimeout(timer);
      removeEventListener("beforeinstallprompt", onInstallEvent);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!platform) return null;

  const close = () => {
    markDismissed(storage());
    setPlatform(null);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    close();
  };

  const nativeInstall = platform === "android" && installEvent !== null;

  return (
    <Sheet title={t.install.title} onClose={close}>
      <p className="mt-0 mb-4">{t.install.lede}</p>
      {!nativeInstall && (
        <ol className="mt-0 mb-5 flex list-decimal flex-col gap-2 pl-6">
          {platform === "ios" ? (
            <>
              <li>
                {t.install.iosShare.before}{" "}
                <svg
                  role="img"
                  aria-label={t.install.share}
                  viewBox="0 0 24 24"
                  className="inline size-5 align-[-0.2em]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12M8 7l4-4 4 4M7 11H5v10h14V11h-2" />
                </svg>
                {t.install.iosShare.after}
              </li>
              <li>{t.install.iosAdd}</li>
            </>
          ) : (
            <>
              <li>{t.install.androidMenu}</li>
              <li>{t.install.androidAdd}</li>
            </>
          )}
        </ol>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className={textButton} onClick={close}>
          {t.install.later}
        </button>
        {nativeInstall && (
          <button type="button" className={primaryButton} onClick={install}>
            {t.install.install}
          </button>
        )}
      </div>
    </Sheet>
  );
}
