/** Phones that can add the app to their home screen; each gets its own instructions. */
export type InstallPlatform = "android" | "ios";

/** Which home-screen instructions to offer, or null on desktop and inside the installed app. */
export function installPlatform({ userAgent, maxTouchPoints, standalone }: { userAgent: string; maxTouchPoints: number; standalone: boolean }): InstallPlatform | null {
  if (standalone) return null;
  // iPadOS asks for the desktop site by default and then reports itself as a Mac; only the touch screen gives it away.
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return null;
}

/**
 * The only thing the app stores on the device: that the home-screen invitation was dismissed, so it never comes back.
 * No setup data is stored; that stays in the URL.
 */
export const DISMISSED_KEY = "poker-solver:install-prompt-dismissed";

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

export function isDismissed(storage: FlagStorage | null): boolean {
  try {
    return storage?.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDismissed(storage: FlagStorage | null): void {
  try {
    storage?.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage can be blocked (private browsing); the invitation then simply shows again next visit.
  }
}

/**
 * Inline script for every page: Chrome on Android may offer installation before React hydrates, so the event is kept
 * on `window` for the invitation to use, and its own mini-infobar is held back in favour of the invitation.
 */
export const INSTALL_EVENT_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installEvent=e})`;
