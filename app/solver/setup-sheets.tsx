"use client";

import { useState } from "react";
import { primaryButton, textButton } from "@/components/buttons";
import { useI18n } from "@/components/i18n-provider";
import { Sheet } from "@/components/sheet";
import { BLIND_STRUCTURE } from "@/content/blind-structure";
import type { Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { blindLevel, blindLevels } from "@/lib/poker/blinds";
import { POSITIONS, type Position, STACK_TIER_LABELS } from "@/lib/poker/table";
import { callerPositions, describeLine, lineSpot, MIN_DEPTH, OPENER_POSITIONS, type OpenerPosition, type PreflopLine } from "@/lib/solver/preflop-line";

const optionButton =
  "h-11 min-w-0 flex-1 rounded-xl bg-night px-0.5 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 aria-pressed:bg-chalk aria-pressed:text-night";
const LEVEL_COUNT = 15;
const inputClass =
  "block h-12 w-full rounded-xl border-2 border-night bg-night px-3 text-chalk text-xl focus-visible:border-chalk focus-visible:outline-none aria-invalid:border-raise";

type Option<T> = { value: T; label: string; disabled?: boolean };

function Choice<T extends string>({ legend, options, value, onChange }: { legend: string; options: readonly Option<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0 text-dust">{legend}</legend>
      <div className="flex gap-1">
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={option.value === value} disabled={option.disabled} onClick={() => onChange(option.value)} className={optionButton}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const parseAmount = (text: string) => (text.trim() === "" ? Number.NaN : Number(text.replace(",", ".")));
/** The field's starting text, with the decimal comma in French. */
const show = (value: number, locale: Locale) => (locale === "fr" ? String(value).replace(".", ",") : String(value));

/** "level 1 (50/50)". */
export function describeLevel(level: number, locale: Locale): string {
  const { sb, bb } = blindLevel(BLIND_STRUCTURE, level);
  return messages(locale).solver.level(level, sb, bb);
}

type LineSheetProps = {
  line: PreflopLine | null;
  depth: number;
  level: number;
  onDone: (line: PreflopLine, depth: number, level: number) => void;
  onClose: () => void;
};

/** Picks the Preflop line, starting Stack depth and Blind level; Done replaces both Ranges, the pot and the stack. */
export function LineSheet({ line, depth, level, onDone, onClose }: LineSheetProps) {
  const { locale, t: messages } = useI18n();
  const t = messages.solver;
  const [kind, setKind] = useState<PreflopLine["kind"]>(line?.kind ?? "open");
  const [opener, setOpener] = useState<OpenerPosition>(line?.kind === "open" ? line.opener : "BTN");
  const [caller, setCaller] = useState<Position>(line?.kind === "open" ? line.caller : "BB");
  const [depthText, setDepthText] = useState(show(depth, locale));
  const [nextLevel, setNextLevel] = useState(level);

  const next: PreflopLine = kind === "limp" ? { kind } : { caller, kind, opener };
  const nextDepth = parseAmount(depthText);
  const result =
    Number.isFinite(nextDepth) && nextDepth > 0 ? lineSpot(next, nextDepth, blindLevel(BLIND_STRUCTURE, nextLevel), locale) : ({ error: t.enterDepth, ok: false } as const);
  const levels = blindLevels(BLIND_STRUCTURE, Math.max(LEVEL_COUNT, level));
  const callers = callerPositions(opener);

  return (
    <Sheet
      title={t.lineHeading}
      onClose={onClose}
      actions={
        <button type="button" disabled={!result.ok} onClick={() => onDone(next, nextDepth, nextLevel)} className={primaryButton}>
          {messages.common.done}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Choice
          legend={t.action}
          options={[
            { label: t.openCall, value: "open" },
            { label: t.limpCheck, value: "limp" },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === "open" && (
          <>
            <Choice
              legend={t.opener}
              options={OPENER_POSITIONS.map((position) => ({ label: position, value: position }))}
              value={opener}
              onChange={(value) => {
                setOpener(value);
                if (!callerPositions(value).includes(caller)) setCaller("BB");
              }}
            />
            <Choice
              legend={t.caller}
              options={POSITIONS.filter((position) => position !== "UTG").map((position) => ({ disabled: !callers.includes(position), label: position, value: position }))}
              value={caller}
              onChange={setCaller}
            />
          </>
        )}
        <label className="block">
          <span className="mb-1.5 block text-dust">{t.depthField}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={depthText}
            aria-invalid={!result.ok}
            aria-describedby="line-summary"
            onChange={(event) => setDepthText(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-dust">{t.levelField}</span>
          <select value={nextLevel} onChange={(event) => setNextLevel(Number(event.target.value))} className={inputClass}>
            {levels.map((option, index) => (
              <option key={index} value={index + 1}>
                {t.levelOption(index + 1, option.sb, option.bb)}
              </option>
            ))}
          </select>
        </label>
        <p id="line-summary" aria-live="polite" className={`m-0 ${result.ok ? "text-chalk" : "text-raise"}`}>
          {result.ok ? (
            <>
              {describeLine(next, nextDepth, locale)}.<span className="block text-dust">{t.lineSummary(result.pot, result.stack, STACK_TIER_LABELS[result.tier])}</span>
            </>
          ) : (
            `${result.error}.`
          )}
        </p>
        <p className="m-0 text-dust text-sm">{t.lineNote(MIN_DEPTH)}</p>
      </div>
    </Sheet>
  );
}

/** Edits the pot and effective stack at the start of the Spot, in bb. */
export function AmountsSheet(props: { pot: number; stack: number; canReset: boolean; onDone: (pot: number, stack: number) => void; onReset: () => void; onClose: () => void }) {
  const { locale, t: messages } = useI18n();
  const t = messages.solver;
  const [potText, setPotText] = useState(Number.isNaN(props.pot) ? "" : show(props.pot, locale));
  const [stackText, setStackText] = useState(Number.isNaN(props.stack) ? "" : show(props.stack, locale));
  const pot = parseAmount(potText);
  const stack = parseAmount(stackText);
  const potOk = Number.isFinite(pot) && pot > 0;
  const stackOk = Number.isFinite(stack) && stack >= 0;

  return (
    <Sheet
      title={t.amountsTitle}
      onClose={props.onClose}
      actions={
        <button type="button" disabled={!potOk || !stackOk} onClick={() => props.onDone(pot, stack)} className={primaryButton}>
          {messages.common.done}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-dust">{t.potField}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={potText}
            aria-invalid={!potOk}
            onChange={(event) => setPotText(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-dust">{t.stackField}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={stackText}
            aria-invalid={!stackOk}
            onChange={(event) => setStackText(event.target.value)}
            className={inputClass}
          />
        </label>
        {potOk && stackOk && <p className="m-0 text-dust">{t.sprValue(stack / pot)}</p>}
        {props.canReset && (
          <div>
            <button type="button" onClick={props.onReset} className={`-ml-4 ${textButton}`}>
              {t.useLine}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
