# Charts live in the repo; the app persists nothing

Charts are TypeScript files in the repository, written in range-string notation (e.g. `"22+, A2s+, AJo:0.7"`) and validated at build time. The owner edits them locally, then pushes to deploy on Vercel. The in-app Ranges editor is a scratchpad: it copies a range string to paste into a file and never saves on the device. We chose this over on-device storage or accounts because the app has one user, the Charts are tuned from session results at a desk, and git gives history and backup for free. It also means there is no backend.
