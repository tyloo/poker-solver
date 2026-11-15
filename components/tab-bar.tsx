"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/", label: "Advisor" },
  { href: "/equity", label: "Equity" },
  { href: "/ranges", label: "Ranges" },
  { href: "/solver", label: "Solver" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Tools" className="fixed inset-x-0 bottom-0 z-40 border-booth border-t-2 bg-night pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-[30rem] grid-cols-4">
        {TOOLS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 items-center justify-center font-display font-bold text-xl transition-colors focus-visible:outline-3 focus-visible:outline-chalk focus-visible:-outline-offset-4 ${
                  active ? "text-chalk" : "text-dust hover:text-chalk"
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-x-5 -top-0.5 h-[3px] rounded-b-full bg-raise" />}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
