"use client";

import { useSearchParams } from "next/navigation";

export type Codec<T> = {
  parse: (raw: string | null) => T;
  /** `null` removes the param, so defaults keep URLs short. */
  serialize: (value: T) => string | null;
};

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
};

export function withParam(search: string, key: string, value: string | null): string {
  const params = new URLSearchParams(search);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * State stored in the URL query string (see spec: nothing is persisted on the device).
 * Components using it must render inside a <Suspense> boundary for static export.
 */
export function useUrlState<T>(key: string, codec: Codec<T>, history: "replace" | "push" = "replace"): [T, (value: T) => void] {
  const searchParams = useSearchParams();
  const value = codec.parse(searchParams.get(key));

  const setValue = (next: T) => {
    const url = `${window.location.pathname}${withParam(window.location.search, key, codec.serialize(next))}`;
    if (history === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };

  return [value, setValue];
}
