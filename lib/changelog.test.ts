import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RELEASES } from "@/content/changelog";
import { APP_VERSION, changelogMarkdown, frenchSpacing, inlineParts, type Release } from "./changelog";

const sample: Release[] = [
  { changes: { added: [{ en: "A `code` and **bold** thing.", fr: "x" }], fixed: [{ en: "A fix.", fr: "x" }] }, date: "2026-02-01", version: "1.1.0" },
  { changes: { added: [{ en: "Everything.", fr: "x" }] }, date: "2026-01-01", summary: { en: "First.", fr: "x" }, version: "1.0.0" },
];

describe("changelogMarkdown", () => {
  it("writes Keep a Changelog sections, newest first, with compare links", () => {
    expect(changelogMarkdown(sample, "https://github.com/me/app")).toBe(`# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The app shows the same notes in English and French; edit \`content/changelog.ts\` and run \`pnpm changelog\`.

## [1.1.0] - 2026-02-01

### Added

- A \`code\` and **bold** thing.

### Fixed

- A fix.

## [1.0.0] - 2026-01-01

First.

### Added

- Everything.

[1.1.0]: https://github.com/me/app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/me/app/releases/tag/v1.0.0
`);
  });

  it("matches the committed CHANGELOG.md", () => {
    const committed = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    expect(committed).toBe(changelogMarkdown(RELEASES));
  });
});

describe("release notes", () => {
  it("make the newest release the app version, as in package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(APP_VERSION).toBe(RELEASES[0].version);
    expect(pkg.version).toBe(APP_VERSION);
  });

  it("list versions newest first, each once, with notes in both languages", () => {
    const versions = RELEASES.map((release) => release.version);
    const order = (version: string) => version.split(".").reduce((total, part) => total * 1000 + Number(part), 0);
    expect([...versions].sort((a, b) => order(b) - order(a))).toEqual(versions);
    expect(new Set(versions).size).toBe(versions.length);
    for (const release of RELEASES) {
      const texts = [...Object.values(release.changes).flat(), ...(release.summary ? [release.summary] : [])];
      expect(texts.length).toBeGreaterThan(0);
      for (const text of texts) {
        expect(text.en.trim()).not.toBe("");
        expect(text.fr.trim()).not.toBe("");
      }
    }
  });
});

describe("inlineParts", () => {
  it("splits bold and code out of plain text", () => {
    expect(inlineParts("**Advisor**: on `/fr` now.")).toEqual([
      { kind: "bold", text: "Advisor" },
      { kind: "text", text: ": on " },
      { kind: "code", text: "/fr" },
      { kind: "text", text: " now." },
    ]);
    expect(inlineParts("Plain.")).toEqual([{ kind: "text", text: "Plain." }]);
  });
});

describe("frenchSpacing", () => {
  it("puts no-break spaces before colons and inside guillemets, narrow ones before ; ! ?", () => {
    expect(frenchSpacing("« Résoudre » : oui ; non ! vrai ?")).toBe("«\u00a0Résoudre\u00a0»\u00a0: oui\u202f; non\u202f! vrai\u202f?");
  });

  it("leaves code alone", () => {
    expect(frenchSpacing("Sur `/fr` : `12 500`")).toBe("Sur `/fr`\u00a0: `12 500`");
  });
});
