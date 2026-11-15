"use client";

import { type Position, tablePositions } from "@/lib/poker/table";

type Props = {
  players: number;
  /** The hero's seat. */
  position: Position | null;
  onPosition: (position: Position) => void;
  /** Short tags on other seats, e.g. "Opened". */
  marks?: Partial<Record<Position, string>>;
};

/** Seat centres in % of the table box: the button at the bottom, then clockwise in acting order. */
function seatPoints(seats: readonly Position[]): { position: Position; x: number; y: number }[] {
  const dealer = seats.includes("BTN") ? seats.indexOf("BTN") : seats.indexOf("SB");
  return seats.map((position, index) => {
    const angle = Math.PI / 2 + (2 * Math.PI * (index - dealer)) / seats.length;
    return { position, x: 50 + 40 * Math.cos(angle), y: 50 + 39 * Math.sin(angle) };
  });
}

/** An oval table seating the Positions of a `players`-handed game; tap a seat to sit there. */
export function OvalTable({ players, position, onPosition, marks = {} }: Props) {
  const seats = tablePositions(players);
  const points = seatPoints(seats);
  const dealer = points.find((point) => point.position === (seats.includes("BTN") ? "BTN" : "SB"));

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Your seat</legend>
      <div className="relative aspect-[16/11] w-full">
        <div aria-hidden="true" className="absolute inset-[13%_11%] rounded-[50%] border-2 border-fold bg-booth" />
        <p aria-hidden="true" className="absolute inset-x-[22%] top-1/2 m-0 -translate-y-1/2 text-center text-dust leading-tight">
          {position ? (
            <>
              <span className="block font-bold font-display text-2xl text-chalk">You: {position}</span>
              {players}-handed
            </>
          ) : (
            "Tap your seat"
          )}
        </p>
        {dealer && (
          <span
            aria-hidden="true"
            className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-chalk font-bold text-night text-xs"
            style={{ left: `${dealer.x + (50 - dealer.x) * 0.38 + 9}%`, top: `${dealer.y + (50 - dealer.y) * 0.38}%` }}
          >
            D
          </span>
        )}
        {points.map(({ position: seat, x, y }) => {
          const mark = marks[seat];
          return (
            <button
              key={seat}
              type="button"
              aria-pressed={seat === position}
              onClick={() => onPosition(seat)}
              className="absolute flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-fold bg-night font-bold font-display text-chalk text-lg leading-none transition-colors hover:border-dust focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2 aria-pressed:border-chalk aria-pressed:bg-chalk aria-pressed:text-night"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {seat}
              {mark && <span className="mt-0.5 font-sans font-normal text-[0.6875rem] text-dust">{mark}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
