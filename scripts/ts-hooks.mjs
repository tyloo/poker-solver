// Lets Node run the repo's TypeScript directly (`node --import ./scripts/ts-hooks.mjs file.ts`):
// resolves the `@/` alias and extensionless relative imports to `.ts` files. Node strips the types.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    let url;
    if (specifier.startsWith("@/")) url = new URL(specifier.slice(2), root);
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) url = new URL(specifier, context.parentURL);
    else return nextResolve(specifier, context);
    if (!/\.[cm]?[jt]s$/.test(url.pathname) && existsSync(fileURLToPath(`${url.href}.ts`))) url = new URL(`${url.href}.ts`);
    return nextResolve(url.href, context);
  },
});
