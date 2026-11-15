import { LanguageSwitch } from "./language-switch";
import { VersionButton } from "./version-button";

export function ToolHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="m-0 font-display font-extrabold text-[3.25rem] leading-[0.9]">{title}</h1>
        <div className="-mr-2 flex shrink-0 items-start">
          <VersionButton />
          <LanguageSwitch />
        </div>
      </div>
      <p className="mt-3 mb-0 max-w-[34ch] text-dust">{lede}</p>
    </header>
  );
}
