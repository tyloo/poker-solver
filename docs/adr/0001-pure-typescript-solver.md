# Pure TypeScript solver, no WebAssembly

The Solver is a CFR implementation written in TypeScript and run in a Web Worker on the phone, not a WebAssembly engine. The obvious WASM candidate (`postflop-solver`, behind Desktop Postflop) has stopped development, and the owner wants no WASM toolchain in the project. Pure JS is slower and uses more memory, so turn and river Spots are fully supported, while flop Spots are allowed only with a small tree (one bet size plus all-in) and a warning. Short tournament stacks (low SPR) keep most real trees small enough.
