import { RELEASES } from "@/content/changelog";

export type ChangeKind = "added" | "changed" | "fixed";

/** The same note in both languages. Inline `**bold**` and `` `code` `` only. */
export type ReleaseText = { en: string; fr: string };

export type Release = {
  version: string;
  /** ISO date, e.g. "2026-11-15". */
  date: string;
  summary?: ReleaseText;
  changes: Partial<Record<ChangeKind, readonly ReleaseText[]>>;
};

export const CHANGE_KINDS: readonly ChangeKind[] = ["added", "changed", "fixed"];

/** The newest release, shown next to the language switch. */
export const APP_VERSION = RELEASES[0].version;

const REPOSITORY = "https://github.com/tyloo/poker-solver";
const HEADINGS: Record<ChangeKind, string> = { added: "Added", changed: "Changed", fixed: "Fixed" };

/** CHANGELOG.md from the English notes, in Keep a Changelog format. */
export function changelogMarkdown(releases: readonly Release[], repository = REPOSITORY): string {
  const intro =
    "All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). The app shows the same notes in English and French; edit `content/changelog.ts` and run `pnpm changelog`.";
  const sections = releases.map((release) => {
    const lines = [`## [${release.version}] - ${release.date}`];
    if (release.summary) lines.push(release.summary.en);
    for (const kind of CHANGE_KINDS) {
      const notes = release.changes[kind];
      if (notes?.length) lines.push(`### ${HEADINGS[kind]}`, notes.map((note) => `- ${note.en}`).join("\n"));
    }
    return lines.join("\n\n");
  });
  const links = releases.map((release, index) => {
    const previous = releases[index + 1];
    return `[${release.version}]: ${repository}/${previous ? `compare/v${previous.version}...v${release.version}` : `releases/tag/v${release.version}`}`;
  });
  return `${["# Changelog", intro, ...sections, links.join("\n")].join("\n\n")}\n`;
}

export type InlinePart = { kind: "text" | "bold" | "code"; text: string };

/** Splits a note into plain text, `**bold**` and `` `code` `` for display. */
export function inlineParts(text: string): InlinePart[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**")) return { kind: "bold", text: part.slice(2, -2) };
      if (part.startsWith("`")) return { kind: "code", text: part.slice(1, -1) };
      return { kind: "text", text: part };
    });
}

/** French typography outside code: a no-break space before ":" and inside « », a narrow one before ";", "!" and "?". */
export function frenchSpacing(text: string): string {
  return text
    .split(/(`[^`]+`)/)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replace(/« /g, "«\u00a0")
            .replace(/ »/g, "\u00a0»")
            .replace(/ :/g, "\u00a0:")
            .replace(/ ([;!?])/g, "\u202f$1"),
    )
    .join("");
}
