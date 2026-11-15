// Writes CHANGELOG.md from the English release notes in content/changelog.ts.
import { writeFileSync } from "node:fs";
import { RELEASES } from "@/content/changelog";
import { changelogMarkdown } from "@/lib/changelog";

writeFileSync(new URL("../CHANGELOG.md", import.meta.url), changelogMarkdown(RELEASES));
console.log(`CHANGELOG.md written: ${RELEASES.length} releases, newest ${RELEASES[0].version}.`);
