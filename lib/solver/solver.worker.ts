/// <reference lib="webworker" />
import { createSolverHost } from "./host";
import type { SolverRequest } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

const host = createSolverHost((message, transfer = []) => self.postMessage(message, transfer));
self.onmessage = (event: MessageEvent<SolverRequest>) => host.handle(event.data);
