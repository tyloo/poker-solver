# Contributing

Thanks for your interest. Issues and pull requests are welcome.

## Before you open a pull request

All four checks must pass:

```sh
pnpm test
pnpm type-check
pnpm lint
pnpm build
```

## Guidelines

- **Vocabulary**: use the terms defined in [`GLOSSARY.md`](GLOSSARY.md) in code and UI (Position, not seat; Hand class, not cell).
- **Maths is test-first**: poker logic (evaluator, equity, ranges, solver, push/fold) is tested against known reference values. Add a test with a cited reference for any new maths.
- **Pure logic in `lib/`**: keep domain code free of React and UI text. Heavy work runs in a Web Worker behind a thin wrapper.
- **Both languages**: every user-visible string goes in `lib/i18n/en.ts` and `lib/i18n/fr.ts`. A test fails if a French string is missing.
- **Nothing persisted**: app state lives in the URL query string. Don't add localStorage, cookies or IndexedDB. The one exception is the flag that remembers the home-screen invitation was dismissed (`lib/install-prompt.ts`).
- **No new runtime dependencies** without discussing it in an issue first.
- **Design**: dark only, with hard shadows only on playing cards and the verdict card, the verdict flip as the only automatic motion, visible keyboard focus, `prefers-reduced-motion` respected, touch targets of at least 44px, and WCAG AA contrast.
- **Decisions**: significant architecture choices go in [`docs/adr/`](docs/adr).
- **Releases**: add the release notes in English and French at the top of [`content/changelog.ts`](content/changelog.ts), bump `version` in `package.json` to match, run `pnpm changelog`, and tag the commit `vX.Y.Z`. The app shows the notes when you tap the version.

## Next.js version

This project uses Next.js 16, whose APIs differ from older versions. Check the docs bundled in `node_modules/next/dist/docs/` before changing routing, layouts or the build.
