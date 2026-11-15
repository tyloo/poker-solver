"use client";

import { useId, useState } from "react";
import { parseAmount } from "@/lib/advisor/setup";

type Props = {
  label: string;
  value: number | null;
  /** Called on every edit with the parsed number, or null when the field is empty or invalid. */
  onChange: (value: number | null) => void;
  /** Unit shown after the field, e.g. "chips". */
  unit?: string;
  /** Allows decimals (bb); otherwise whole numbers (chips). */
  decimal?: boolean;
  /** Accepts 0 (e.g. no bet); otherwise the value must be positive. */
  allowZero?: boolean;
  placeholder?: string;
  className?: string;
};

const show = (value: number | null) => (value === null ? "" : String(value));

/** A number input that keeps what is typed and reports the parsed value. */
export function NumberField({ label, value, onChange, unit, decimal = false, allowZero = false, placeholder, className = "" }: Props) {
  const id = useId();
  const [text, setText] = useState(() => show(value));
  const [reported, setReported] = useState(value);

  // The value changed from outside (back button, another control): show it.
  if (value !== reported) {
    setReported(value);
    if (parseAmount(text, { allowZero, decimal }) !== value) setText(show(value));
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-dust">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-xl bg-booth focus-within:outline-3 focus-within:outline-chalk focus-within:outline-offset-2">
        <input
          id={id}
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            const next = parseAmount(event.target.value, { allowZero, decimal });
            setText(event.target.value);
            setReported(next);
            onChange(next);
          }}
          className="h-full w-full min-w-0 bg-transparent px-4 font-bold text-chalk text-xl outline-none placeholder:font-normal placeholder:text-dust/70"
        />
        {unit && (
          <span aria-hidden="true" className="pr-4 text-dust">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
