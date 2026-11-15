# Poker Solver

A personal mobile study and quick-check tool for No-Limit Texas Hold'em, tuned for live 8-max freeroll tournaments (RedCactus Poker league).

## Language

### Tools

**Equity**:
The tool that computes each player's share of the pot at showdown for given hands or ranges and a board.
_Avoid_: Calculator, odds

**Ranges**:
The tool that shows and edits the player's preflop **Charts**.
_Avoid_: Charts tab, preflop

**Solver**:
The tool that computes a game-theory-optimal postflop strategy for a heads-up **Spot**.
_Avoid_: GTO, engine

**Advisor**:
The tool that recommends an action for a concrete hand in a concrete situation.
_Avoid_: Helper, coach

### Hands and ranges

**Combo**:
One specific pair of hole cards, e.g. A♠K♦.
_Avoid_: Hand (when a specific card pair is meant)

**Hand class**:
One of the 169 strategically distinct starting hands (pairs, suited, offsuit), e.g. AKs; one cell of the 13×13 grid.
_Avoid_: Hand type, cell

**Range**:
A set of **Hand classes** or **Combos**, each with a weight, that a player can hold.

**Action frequency**:
The share of a **Hand class** played with a given action, e.g. AJo raise 70% / fold 30%.
_Avoid_: Mix, percentage

**Chart**:
A preflop strategy for one **Position**, **Stack tier** and **Situation**, assigning **Action frequencies** to every **Hand class**.
_Avoid_: Range (for the whole multi-action strategy), table

**Situation**:
The preflop action before the player acts: Open (folded to you), Vs open, Vs limpers, or the push/fold pair Push and Vs push.
_Avoid_: Scenario, node

**Push/fold chart**:
A **Chart** for short stacks whose only actions are all-in or fold (Push), or call all-in or fold (Vs push).
_Avoid_: Jam chart, shove chart

**Preflop line**:
The sequence of preflop actions that leads to a postflop **Spot**, e.g. CO opens, BB calls.
_Avoid_: Action sequence, history

### Table

**Position**:
A seat relative to the button at an 8-max table: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB. At a short-handed table the earliest Positions drop out first.
_Avoid_: Seat

**Stack depth**:
A stack measured in big blinds.
_Avoid_: Stack size, bb count

**Stack tier**:
A band of **Stack depth** that has its own raising **Charts**: 40bb+, 25bb, or 15–20bb. Below 15bb, **Push/fold charts** apply.
_Avoid_: Bucket, depth level

**Blind structure**:
The ordered list of **Blind levels** and the starting stack of a tournament.
_Avoid_: Schedule, blinds

**Blind level**:
One step of the **Blind structure**, given as small blind / big blind in chips, e.g. 200/400.
_Avoid_: Round, stage

**Player type**:
A preset describing how an opponent plays preflop (Tight, Standard, Loose), used to estimate their **Range** from the **Preflop line**. Standard equals the player's own **Charts**.
_Avoid_: Profile, villain type

**Spot**:
A postflop situation given to the **Solver**: two **Ranges**, a board, pot, effective **Stack depth** and allowed bet sizes.
_Avoid_: Scenario, situation
