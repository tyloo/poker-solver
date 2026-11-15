"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { POSITIONS, type Position, STACK_TIER_LABELS } from "@/lib/poker/table";
import { callerPositions, describeLine, lineSpot, MIN_DEPTH, OPENER_POSITIONS, type OpenerPosition, type PreflopLine } from "@/lib/solver/preflop-line";

const primaryButton =
  "h-12 rounded-full bg-chalk px-6 font-bold font-display text-night text-xl focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-3 disabled:opacity-40";
const optionButton =
  "h-11 min-w-0 flex-1 rounded-xl bg-night px-0.5 font-bold font-display text-lg leading-none focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 disabled:opacity-35 aria-pressed:bg-chalk aria-pressed:text-night";
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
const bb = (value: number) => `${Number(value.toFixed(2))}bb`;

/** Picks the Preflop line and starting Stack depth; Done replaces both Ranges, the pot and the stack. */
export function LineSheet({ line, depth, onDone, onClose }: { line: PreflopLine | null; depth: number; onDone: (line: PreflopLine, depth: number) => void; onClose: () => void }) {
  const [kind, setKind] = useState<PreflopLine["kind"]>(line?.kind ?? "open");
  const [opener, setOpener] = useState<OpenerPosition>(line?.kind === "open" ? line.opener : "BTN");
  const [caller, setCaller] = useState<Position>(line?.kind === "open" ? line.caller : "BB");
  const [depthText, setDepthText] = useState(String(depth));

  const next: PreflopLine = kind === "limp" ? { kind } : { caller, kind, opener };
  const nextDepth = parseAmount(depthText);
  const result = Number.isFinite(nextDepth) && nextDepth > 0 ? lineSpot(next, nextDepth) : ({ error: "Enter the stack depth in bb", ok: false } as const);
  const callers = callerPositions(opener);

  return (
    <Sheet
      title="Preflop line"
      onClose={onClose}
      actions={
        <button type="button" disabled={!result.ok} onClick={() => onDone(next, nextDepth)} className={primaryButton}>
          Done
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Choice
          legend="Action"
          options={[
            { label: "Open, call", value: "open" },
            { label: "SB limps, BB checks", value: "limp" },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === "open" && (
          <>
            <Choice
              legend="Opener"
              options={OPENER_POSITIONS.map((position) => ({ label: position, value: position }))}
              value={opener}
              onChange={(value) => {
                setOpener(value);
                if (!callerPositions(value).includes(caller)) setCaller("BB");
              }}
            />
            <Choice
              legend="Caller"
              options={POSITIONS.filter((position) => position !== "UTG").map((position) => ({ disabled: !callers.includes(position), label: position, value: position }))}
              value={caller}
              onChange={setCaller}
            />
          </>
        )}
        <label className="block">
          <span className="mb-1.5 block text-dust">Effective stack before the hand, in bb</span>
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
        <p id="line-summary" aria-live="polite" className={`m-0 ${result.ok ? "text-chalk" : "text-raise"}`}>
          {result.ok ? (
            <>
              {describeLine(next, nextDepth)}.
              <span className="block text-dust">{`Pot ${bb(result.pot)}, ${bb(result.stack)} behind. Ranges from your ${STACK_TIER_LABELS[result.tier]} Charts.`}</span>
            </>
          ) : (
            `${result.error}.`
          )}
        </p>
        <p className="m-0 text-dust text-sm">{`Done replaces both ranges, the pot and the stack. Below ${MIN_DEPTH}bb the Push/fold charts apply.`}</p>
      </div>
    </Sheet>
  );
}

/** Edits the pot and effective stack at the start of the Spot, in bb. */
export function AmountsSheet(props: { pot: number; stack: number; canReset: boolean; onDone: (pot: number, stack: number) => void; onReset: () => void; onClose: () => void }) {
  const [potText, setPotText] = useState(Number.isNaN(props.pot) ? "" : String(props.pot));
  const [stackText, setStackText] = useState(Number.isNaN(props.stack) ? "" : String(props.stack));
  const pot = parseAmount(potText);
  const stack = parseAmount(stackText);
  const potOk = Number.isFinite(pot) && pot > 0;
  const stackOk = Number.isFinite(stack) && stack >= 0;

  return (
    <Sheet
      title="Pot and stack"
      onClose={props.onClose}
      actions={
        <button type="button" disabled={!potOk || !stackOk} onClick={() => props.onDone(pot, stack)} className={primaryButton}>
          Done
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-dust">Pot at the start of the street, in bb</span>
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
          <span className="mb-1.5 block text-dust">Effective stack behind, in bb</span>
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
        {potOk && stackOk && <p className="m-0 text-dust">{`SPR ${(stack / pot).toFixed(1)}`}</p>}
        {props.canReset && (
          <div>
            <button
              type="button"
              onClick={props.onReset}
              className="-ml-4 h-12 rounded-full px-4 font-bold text-dust underline decoration-2 underline-offset-4 hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk"
            >
              Use the Preflop line's amounts
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
