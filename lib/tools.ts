/** The tools in tab order. English paths: French ones add `/fr` (`localeHref`). `public/sw.js` copies the paths, checked by a test. */
export const TOOLS = [
  { id: "advisor", path: "/" },
  { id: "equity", path: "/equity" },
  { id: "ranges", path: "/ranges" },
  { id: "solver", path: "/solver" },
  { id: "glossary", path: "/glossary" },
] as const;

export type Tool = (typeof TOOLS)[number]["id"];
