import { LanguageSwitch } from "./language-switch";

export function ToolHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="m-0 font-display font-extrabold text-[3.25rem] leading-[0.9]">{title}</h1>
        <LanguageSwitch />
      </div>
      <p className="mt-3 mb-0 max-w-[34ch] text-dust">{lede}</p>
    </header>
  );
}
