"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

type Props = {
  title: string;
  /** Called on Escape or a tap outside the sheet; the parent closes it by unmounting it. */
  onClose: () => void;
  /** Buttons shown next to the title, e.g. Done. */
  actions?: ReactNode;
  children: ReactNode;
};

/** Bottom sheet on a modal <dialog>. It opens when mounted, so render it only while open. */
export function Sheet({ title, onClose, actions, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only catches taps on the backdrop; Escape closes through onCancel.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        // React bubbles a nested sheet's cancel up here; only the top sheet closes.
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-[30rem] overflow-y-auto overscroll-contain rounded-t-3xl border-0 bg-booth p-0 text-chalk backdrop:bg-pit/75"
    >
      <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="m-0 font-bold font-display text-3xl leading-none">
            {title}
          </h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
        {children}
      </div>
    </dialog>
  );
}
