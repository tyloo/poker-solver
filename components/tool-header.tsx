import type { ReactNode } from "react";

export function ToolHeader({ title, lede, aside }: { title: string; lede: string; aside?: ReactNode }) {
  return (
    <header className="mb-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="m-0 font-display font-extrabold text-[3.25rem] leading-[0.9]">{title}</h1>
        {aside}
      </div>
      <p className="mt-3 mb-0 max-w-[34ch] text-dust">{lede}</p>
    </header>
  );
}
