"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toolPath } from "@/lib/i18n/locale";
import { useI18n } from "./i18n-provider";

const TOOLS = [
  { href: "/", tool: "advisor" },
  { href: "/equity", tool: "equity" },
  { href: "/ranges", tool: "ranges" },
  { href: "/solver", tool: "solver" },
  { href: "/glossary", tool: "glossary" },
] as const;

export function TabBar() {
  const { t, href: localised } = useI18n();
  const path = toolPath(usePathname());

  return (
    <nav aria-label={t.tabs.label} className="fixed inset-x-0 bottom-0 z-40 border-booth border-t-2 bg-night pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-[30rem] grid-cols-5">
        {TOOLS.map(({ href, tool }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={localised(href)}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 items-center justify-center font-display font-bold text-lg transition-colors min-[25rem]:text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:-outline-offset-4 ${
                  active ? "text-chalk" : "text-dust hover:text-chalk"
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-5 -top-0.5 h-[3px] rounded-b-full bg-raise" />}
                {t.tabs[tool]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
