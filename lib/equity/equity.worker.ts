/// <reference lib="webworker" />
import { createEquityRunner, type EquityRequest } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

// A message round trip yields to queued messages without the 4ms clamp of nested timeouts.
const channel = new MessageChannel();
const waiting: (() => void)[] = [];
channel.port1.onmessage = () => waiting.shift()?.();
const yieldToEvents = () =>
  new Promise<void>((resolve) => {
    waiting.push(resolve);
    channel.port2.postMessage(null);
  });

const handle = createEquityRunner((message) => self.postMessage(message), { yieldToEvents });

self.onmessage = (event: MessageEvent<EquityRequest>) => {
  handle(event.data);
};
