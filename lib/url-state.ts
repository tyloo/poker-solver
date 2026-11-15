"use client";

import { useSearchParams } from "next/navigation";
import { HAND_CLASS_NAMES, type HandClassId } from "@/lib/poker/combo";

export type Codec<T> = {
  parse: (raw: string | null) => T;
  /** `null` removes the param, so defaults keep URLs short. */
  serialize: (value: T) => string | null;
};

const NONE = "none";

export const codecs = {
  string: (fallback: string): Codec<string> => ({
    parse: (raw) => raw ?? fallback,
    serialize: (value) => (value === fallback ? null : value),
  }),
  int: (fallback: number): Codec<number> => ({
    parse: (raw) => {
      const value = raw === null ? Number.NaN : Number.parseInt(raw, 10);
      return Number.isFinite(value) ? value : fallback;
    },
    serialize: (value) => (value === fallback ? null : String(value)),
  }),
  oneOf: <const T extends string>(values: readonly T[], fallback: T): Codec<T> => ({
    parse: (raw) => (values.includes(raw as T) ? (raw as T) : fallback),
    serialize: (value) => (value === fallback ? null : value),
  }),
  /** A Hand class by name ("AKs"); `none` clears a non-null fallback. */
  handClass: (fallback: HandClassId | null): Codec<HandClassId | null> => ({
    parse: (raw) => {
      if (raw === NONE) return null;
      const cls = raw === null ? -1 : HAND_CLASS_NAMES.indexOf(raw);
      return cls >= 0 ? cls : fallback;
    },
    serialize: (value) => (value === fallback ? null : value === null ? NONE : HAND_CLASS_NAMES[value]),
  }),
};

/** Query param of the Hand class selected on a 13×13 grid. */
export const HAND_CLASS_PARAM = "class";

export function withParam(search: string, key: string, value: string | null): string {
  return withParams(search, { [key]: value });
}

/** Sets several params at once; `null` removes one. */
export function withParams(search: string, values: Readonly<Record<string, string | null>>): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(values)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The URL of `location` with several params set; the path and hash stay. */
export const urlWithParams = ({ pathname, search, hash }: Pick<Location, "pathname" | "search" | "hash">, values: Readonly<Record<string, string | null>>): string =>
  `${pathname}${withParams(search, values)}${hash}`;

/** Writes several query params as one history entry (each `useUrlState` setter writes only its own key). */
export function setUrlParams(values: Readonly<Record<string, string | null>>, history: "replace" | "push" = "replace"): void {
  const url = urlWithParams(window.location, values);
  if (history === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/**
 * State stored in the URL query string (see spec: nothing is persisted on the device).
 * Components using it must render inside a <Suspense> boundary for static export.
 */
export function useUrlState<T>(key: string, codec: Codec<T>, history: "replace" | "push" = "replace"): [T, (value: T) => void] {
  const searchParams = useSearchParams();
  const value = codec.parse(searchParams.get(key));

  const setValue = (next: T) => setUrlParams({ [key]: codec.serialize(next) }, history);

  return [value, setValue];
}
