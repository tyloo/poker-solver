"use client";

import { useEffect, useRef, useState } from "react";
import type { EquityError, EquityInput, EquityResult } from "./engine";
import type { EquityRequest, EquityResponse } from "./protocol";

export type EquityRun =
  | { status: "idle" }
  | { status: "running"; result: EquityResult | null }
  | { status: "done"; result: EquityResult }
  | { status: "error"; error: EquityError };

/**
 * Computes equity in a Web Worker and restarts whenever `key` changes, so `key` must identify `input`
 * (e.g. its URL form). The worker starts on mount, which also lets the service worker cache it.
 */
export function useEquity(input: EquityInput | null, key: string): EquityRun {
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const [run, setRun] = useState<EquityRun>({ status: "idle" });

  useEffect(() => {
    const worker = new Worker(new URL("./equity.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<EquityResponse>) => {
      const message = event.data;
      if (message.id !== requestRef.current) return;
      if (message.type === "error") setRun({ error: message.error, status: "error" });
      else setRun({ result: message.result, status: message.type === "done" ? "done" : "running" });
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++requestRef.current;
    const post = (request: EquityRequest) => workerRef.current?.postMessage(request);
    if (!input) {
      post({ type: "stop" });
      setRun({ status: "idle" });
      return;
    }
    setRun({ result: null, status: "running" });
    post({ id, input, type: "start" });
  }, [key]);

  return run;
}
