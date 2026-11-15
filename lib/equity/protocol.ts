import type { Locale } from "@/lib/i18n/locale";
import { createEquityJob, type EquityInput, type EquityOptions, type EquityResult } from "./engine";

/** `locale` is the language of error messages. */
export type EquityRequest = { type: "start"; id: number; input: EquityInput; locale?: Locale } | { type: "stop" };

export type EquityResponse = { type: "progress" | "done"; id: number; result: EquityResult } | { type: "error"; id: number; message: string };

type RunnerOptions = {
  equity?: EquityOptions;
  now?: () => number;
  /** Lets queued messages (a newer start, a stop) in between slices. */
  yieldToEvents?: () => Promise<void>;
  sliceMs?: number;
  progressMs?: number;
};

const STEP = 4096;

/**
 * Message handler for the equity worker. Work runs in short slices so a newer request can
 * cancel it; only the latest start gets answers.
 */
export function createEquityRunner(post: (message: EquityResponse) => void, options: RunnerOptions = {}) {
  const { now = () => performance.now(), yieldToEvents = () => new Promise<void>((resolve) => setTimeout(resolve, 0)), sliceMs = 30, progressMs = 100 } = options;
  let generation = 0;

  return async (request: EquityRequest): Promise<void> => {
    const token = ++generation;
    if (request.type === "stop") return;

    const { id } = request;
    const outcome = createEquityJob(request.input, { ...options.equity, locale: request.locale });
    if (!outcome.ok) {
      post({ id, message: outcome.error, type: "error" });
      return;
    }
    const { job } = outcome;
    let lastPost = now();
    for (;;) {
      const sliceStart = now();
      let done = false;
      do done = job.step(STEP);
      while (!done && now() - sliceStart < sliceMs);
      if (done) {
        post(job.error ? { id, message: job.error, type: "error" } : { id, result: job.result(), type: "done" });
        return;
      }
      if (now() - lastPost >= progressMs) {
        post({ id, result: job.result(), type: "progress" });
        lastPost = now();
      }
      await yieldToEvents();
      if (token !== generation) return;
    }
  };
}
