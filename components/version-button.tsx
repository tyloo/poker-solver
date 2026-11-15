"use client";

import { Fragment, useState } from "react";
import { RELEASES } from "@/content/changelog";
import { APP_VERSION, CHANGE_KINDS, frenchSpacing, inlineParts } from "@/lib/changelog";
import { primaryButton } from "./buttons";
import { useI18n } from "./i18n-provider";
import { Sheet } from "./sheet";

/** The app version, top right next to the language switch; tapping it opens the release notes. */
export function VersionButton() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const localize = (text: { en: string; fr: string }) => (locale === "fr" ? frenchSpacing(text.fr) : text.en);
  const render = (text: { en: string; fr: string }) =>
    inlineParts(localize(text)).map((part, index) =>
      part.kind === "bold" ? (
        <strong key={index}>{part.text}</strong>
      ) : part.kind === "code" ? (
        <code key={index} className="rounded bg-night px-1 text-[0.9em]">
          {part.text}
        </code>
      ) : (
        <Fragment key={index}>{part.text}</Fragment>
      ),
    );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="-mt-1 flex h-11 shrink-0 items-center rounded-full px-2 font-bold text-dust hover:text-chalk focus-visible:outline-3 focus-visible:outline-chalk focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">{t.changelog.version(APP_VERSION)}</span>
        <span className="sr-only">{t.changelog.open(APP_VERSION)}</span>
      </button>
      {open && (
        <Sheet
          title={t.changelog.title}
          onClose={close}
          actions={
            <button type="button" onClick={close} className={primaryButton}>
              {t.common.done}
            </button>
          }
        >
          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {RELEASES.map((release) => (
              <li key={release.version}>
                <h3 className="m-0 font-bold font-display text-2xl leading-none">
                  {t.changelog.version(release.version)}
                  <span className="ml-2 font-normal font-sans text-base text-dust">{t.changelog.date(release.date)}</span>
                </h3>
                {release.summary && <p className="mt-2 mb-0">{render(release.summary)}</p>}
                {CHANGE_KINDS.map((kind) => {
                  const notes = release.changes[kind];
                  if (!notes?.length) return null;
                  return (
                    <section key={kind} className="mt-3">
                      <h4 className="m-0 font-bold text-dust">{t.changelog.kinds[kind]}</h4>
                      <ul className="mt-1 mb-0 flex list-disc flex-col gap-1.5 pl-5 marker:text-dust">
                        {notes.map((note) => (
                          <li key={note.en}>{render(note)}</li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </>
  );
}
