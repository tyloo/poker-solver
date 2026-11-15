/**
 * Generates the Push/fold charts (content/charts/push.ts and vs-push.ts): a chip-EV Nash equilibrium
 * for 8-max with no antes, every whole Stack depth from 1 to 15bb. Run with `pnpm generate:push-fold`.
 *
 * 1. Exact all-in equities between the 169 Hand classes, enumerating the 134,459 suit-isomorphic
 *    boards on worker threads (counts are exact integers, so the split does not change the result).
 * 2. For each depth and each Position folded to, fictitious play on the single-caller game.
 * 3. A check against published heads-up Nash values, then the two Chart files, formatted with Biome.
 *
 * Deterministic: no randomness, clocks or thread-count dependence in the output.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { PUSH_FOLD_DEPTHS, PUSH_POSITIONS, type PushFoldDepth, type PushPosition } from "@/lib/charts/push-fold";
import { parseHandClass } from "@/lib/poker/combo";
import { pushFoldFilesFrom, pushFoldSources } from "@/lib/push-fold/chart-data";
import { canonicalBoards, createShowdownTally, equityMatrix, tallyBoard } from "@/lib/push-fold/equity-matrix";
import { AA_VS_KK_EQUITY, HU_CALL_MAX_STACK, HU_CALL_SHARE, HU_PUSH_MAX_STACK, HU_PUSH_SHARE, headsUpMismatches } from "@/lib/push-fold/hrc-reference";
import { foldedTo, type PushFoldSolution, solvePushFold } from "@/lib/push-fold/nash";

const ITERATIONS = 3000;
const ROOT = new URL("../", import.meta.url);
const OUTPUT = { push: "content/charts/push.ts", "vs-push": "content/charts/vs-push.ts" } as const;

type Share = { part: number; parts: number };

/** Worker: tallies every `parts`-th canonical board, starting at `part`. */
function tallyShare({ part, parts }: Share): Float64Array {
  const boards = canonicalBoards();
  const tally = createShowdownTally();
  for (let i = part; i < boards.count; i += parts) tallyBoard(tally, boards.cards, i * 5, boards.orbits[i]);
  return tally.scores;
}

function tallyOnWorkers(parts: number): Promise<Float64Array[]> {
  return Promise.all(
    Array.from(
      { length: parts },
      (_, part) =>
        new Promise<Float64Array>((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url), { workerData: { part, parts } satisfies Share });
          worker.once("message", resolve);
          worker.once("error", reject);
        }),
    ),
  );
}

const seconds = (since: number) => `${((performance.now() - since) / 1000).toFixed(1)}s`;

async function main() {
  const started = performance.now();
  const parts = Math.max(1, Math.min(16, availableParallelism()));
  const tally = createShowdownTally();
  for (const scores of await tallyOnWorkers(parts)) for (let k = 0; k < scores.length; k++) tally.scores[k] += scores[k];
  const matrix = equityMatrix(tally);
  const aaVsKk = matrix.equity[(parseHandClass("AA") ?? 0) * 169 + (parseHandClass("KK") ?? 0)];
  console.log(`Equity matrix: ${seconds(started)} on ${parts} threads; AA vs KK ${(aaVsKk * 100).toFixed(3)}%`);
  if (Math.abs(aaVsKk - AA_VS_KK_EQUITY) > 5e-5) throw new Error(`AA vs KK should be ${AA_VS_KK_EQUITY * 100}%`);

  const solving = performance.now();
  const solutions = new Map<string, PushFoldSolution>();
  let worstGap = 0;
  for (const depth of PUSH_FOLD_DEPTHS) {
    for (const pusher of PUSH_POSITIONS) {
      const solution = solvePushFold(matrix, foldedTo(pusher, depth), ITERATIONS);
      solutions.set(`${depth}:${pusher}`, solution);
      worstGap = Math.max(worstGap, solution.gaps.pusher, ...solution.gaps.callers);
    }
  }
  const solved = (depth: PushFoldDepth, pusher: PushPosition) => solutions.get(`${depth}:${pusher}`) as PushFoldSolution;
  console.log(`Solved ${solutions.size} games: ${seconds(solving)}, ${ITERATIONS} iterations, largest gap ${worstGap.toExponential(1)}bb per hand`);

  const headsUp = PUSH_FOLD_DEPTHS.map((depth) => solved(depth, "SB"));
  const problems = [
    ...headsUpMismatches(
      "SB push",
      headsUp.map((solution) => solution.push),
      HU_PUSH_SHARE,
      HU_PUSH_MAX_STACK,
    ),
    ...headsUpMismatches(
      "BB call vs SB",
      headsUp.map((solution) => solution.calls[0]),
      HU_CALL_SHARE,
      HU_CALL_MAX_STACK,
    ),
  ];
  if (problems.length > 0) throw new Error(`Heads-up results disagree with the reference:\n${problems.join("\n")}`);
  console.log("Heads-up SB push and BB call match the published Nash values");

  const sources = pushFoldSources(pushFoldFilesFrom(solved), ITERATIONS);
  const paths = Object.values(OUTPUT).map((path) => new URL(path, ROOT).pathname);
  writeFileSync(paths[0], sources.push);
  writeFileSync(paths[1], sources["vs-push"]);
  execFileSync(new URL("node_modules/.bin/biome", ROOT).pathname, ["format", "--write", ...paths], { stdio: "ignore" });
  console.log(`Wrote ${Object.values(OUTPUT).join(" and ")} in ${seconds(started)}`);
}

if (isMainThread) await main();
else parentPort?.postMessage(tallyShare(workerData as Share));
