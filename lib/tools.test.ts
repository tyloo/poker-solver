import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOOLS } from "./tools";

describe("TOOLS", () => {
  it("starts with the Advisor at /", () => {
    expect(TOOLS[0]).toEqual({ id: "advisor", path: "/" });
  });

  it("matches the pages the service worker caches", () => {
    // public/sw.js cannot import app code, so it keeps its own list of tool paths.
    const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    const list = /const TOOLS = (\[[^\]]*\]);/.exec(sw)?.[1];
    expect(list).toBeDefined();
    expect(JSON.parse(list ?? "[]")).toEqual(TOOLS.filter((tool) => tool.path !== "/").map((tool) => tool.path));
  });
});
