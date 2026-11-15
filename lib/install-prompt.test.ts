import { describe, expect, it } from "vitest";
import { DISMISSED_KEY, installPlatform, isDismissed, markDismissed } from "./install-prompt";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

describe("installPlatform", () => {
  it("recognises iPhones and iPads, including iPads that ask for the desktop site", () => {
    expect(installPlatform({ maxTouchPoints: 5, standalone: false, userAgent: IPHONE })).toBe("ios");
    expect(installPlatform({ maxTouchPoints: 5, standalone: false, userAgent: IPAD_DESKTOP_MODE })).toBe("ios");
  });

  it("recognises Android", () => {
    expect(installPlatform({ maxTouchPoints: 5, standalone: false, userAgent: ANDROID })).toBe("android");
  });

  it("offers nothing on desktop, a Mac or inside the installed app", () => {
    expect(installPlatform({ maxTouchPoints: 0, standalone: false, userAgent: DESKTOP })).toBeNull();
    expect(installPlatform({ maxTouchPoints: 0, standalone: false, userAgent: IPAD_DESKTOP_MODE })).toBeNull();
    expect(installPlatform({ maxTouchPoints: 5, standalone: true, userAgent: IPHONE })).toBeNull();
    expect(installPlatform({ maxTouchPoints: 5, standalone: true, userAgent: ANDROID })).toBeNull();
  });
});

describe("dismissal flag", () => {
  const memoryStorage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), values };
  };

  it("is unset until the prompt is dismissed, then stays set", () => {
    const storage = memoryStorage();
    expect(isDismissed(storage)).toBe(false);
    markDismissed(storage);
    expect(isDismissed(storage)).toBe(true);
    expect([...storage.values.keys()]).toEqual([DISMISSED_KEY]);
  });

  it("treats unavailable storage as not dismissed and does not throw", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(isDismissed(broken)).toBe(false);
    expect(() => markDismissed(broken)).not.toThrow();
    expect(isDismissed(null)).toBe(false);
  });
});
