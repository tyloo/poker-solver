import { describe, expect, it } from "vitest";
import { FRENCH_START_SCRIPT, localeHref, localeOf, switchLocaleHref, toolPath } from "./locale";

describe("locale paths", () => {
  it("reads the locale from the path", () => {
    expect(localeOf("/")).toBe("en");
    expect(localeOf("/equity")).toBe("en");
    expect(localeOf("/fr")).toBe("fr");
    expect(localeOf("/fr/solver")).toBe("fr");
    expect(localeOf("/french")).toBe("en");
  });

  it("strips the locale prefix", () => {
    expect(toolPath("/")).toBe("/");
    expect(toolPath("/ranges")).toBe("/ranges");
    expect(toolPath("/fr")).toBe("/");
    expect(toolPath("/fr/")).toBe("/");
    expect(toolPath("/fr/glossary")).toBe("/glossary");
  });

  it("keeps in-app links in the current language", () => {
    expect(localeHref("en", "/ranges?sit=open")).toBe("/ranges?sit=open");
    expect(localeHref("fr", "/")).toBe("/fr");
    expect(localeHref("fr", "/?hand=AsKd")).toBe("/fr?hand=AsKd");
    expect(localeHref("fr", "/ranges?sit=vs-open&pos=BB")).toBe("/fr/ranges?sit=vs-open&pos=BB");
    expect(localeHref("fr", "/glossary#spr")).toBe("/fr/glossary#spr");
    expect(localeHref("fr", "/solver")).toBe("/fr/solver");
  });

  it("switches language on the same tool with the same query", () => {
    expect(switchLocaleHref("/", "", "fr")).toBe("/fr");
    expect(switchLocaleHref("/", "?hand=AsKd&pos=CO", "fr")).toBe("/fr?hand=AsKd&pos=CO");
    expect(switchLocaleHref("/fr", "?hand=AsKd", "en")).toBe("/?hand=AsKd");
    expect(switchLocaleHref("/fr/equity", "?players=AsKd_*", "en")).toBe("/equity?players=AsKd_*");
    expect(switchLocaleHref("/solver", "?board=Ks7d2h", "fr")).toBe("/fr/solver?board=Ks7d2h");
    expect(switchLocaleHref("/fr/glossary", "", "fr")).toBe("/fr/glossary");
  });
});

describe("first visit in French", () => {
  type Run = { pathname?: string; search?: string; hash?: string; referrer?: string; language?: string };

  /** Runs the inline script against a fake window and returns where it sent the page, if anywhere. */
  function run({ pathname = "/", search = "", hash = "", referrer = "", language = "fr-FR" }: Run): string | null {
    let target: string | null = null;
    const location = { hash, origin: "https://poker.example", pathname, replace: (url: string) => (target = url), search };
    new Function("location", "document", "navigator", FRENCH_START_SCRIPT)(location, { referrer }, { language });
    return target;
  }

  it("opens a session that starts on / in French when the phone is French", () => {
    expect(run({})).toBe("/fr");
    expect(run({ language: "fr" })).toBe("/fr");
    expect(run({ language: "fr-CA", search: "?hand=AsKd" })).toBe("/fr?hand=AsKd");
    expect(run({ referrer: "https://www.google.com/" })).toBe("/fr");
  });

  it("stays in English otherwise", () => {
    expect(run({ language: "en-GB" })).toBeNull();
    expect(run({ language: "fy-NL" })).toBeNull();
    expect(run({ pathname: "/equity" })).toBeNull();
    // Switching to English from a French page is a same-origin navigation.
    expect(run({ referrer: "https://poker.example/fr/equity" })).toBeNull();
  });
});
