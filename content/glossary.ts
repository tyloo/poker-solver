import type { GlossaryTerm } from "@/lib/glossary/glossary";

/**
 * Glossary terms shown on /glossary, grouped by topic in this order. The `id` is the term's
 * anchor (/glossary#<id>): keep it stable, other tools link to it. Aliases are only searched by the
 * filter, not shown. Validated by lib/glossary tests.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
  // Numbers the tools show.
  {
    aliases: ["Your equity"],
    definition: "Your share of the pot if all the cards were dealt out with no more betting: how often you win, plus half your ties (a third for a three-way tie, and so on).",
    example: "AA has about 82% equity against KK before the flop.",
    id: "equity",
    term: "Equity",
    topic: "numbers",
  },
  {
    aliases: ["Win %", "Tie %"],
    definition:
      "Win is how often a hand takes the whole pot at showdown. Tie is how often it splits the pot with one or more players. The Equity tool shows both under each player's equity.",
    id: "win-and-tie",
    term: "Win and tie",
    topic: "numbers",
  },
  {
    definition: "The price of a call: the pot you can win, including the bet, against what the call costs. The Advisor shows it as a ratio.",
    example: "100 in the pot and a 50 bet: you call 50 to win 150, so the pot odds are 3 : 1.",
    id: "pot-odds",
    term: "Pot odds",
    topic: "numbers",
  },
  {
    aliases: ["Equity needed", "Price"],
    definition:
      "The equity a call needs to break even: the call divided by the final pot. With more equity than this the call wins chips in the long run; with less, fold. The Advisor calls it Equity needed.",
    example: "Calling 50 into a final pot of 200 needs 25% equity.",
    id: "required-equity",
    term: "Required equity",
    topic: "numbers",
  },
  {
    abbreviation: "SPR",
    definition:
      "Your stack behind divided by the pot at the start of the street. A low SPR means you are close to all-in already, so a big hand should just get its chips in. The Advisor pushes instead of calling when the SPR is 2 or less.",
    example: "1,000 behind with a 500 pot is an SPR of 2.",
    id: "spr",
    term: "Stack-to-pot ratio",
    topic: "numbers",
  },
  {
    abbreviation: "EV",
    definition:
      "What a play wins or loses on average over many tries. The Solver shows each hand's EV in bb: the chips it expects to take from the pot from this point on, minus what it still has to put in.",
    id: "ev",
    term: "Expected value",
    topic: "numbers",
  },
  {
    definition:
      "How much a perfect counter-strategy could win against the Solver's current strategy, as a share of the pot. It falls as the solve goes on. The Solver stops at 0.5% of the pot or less, and pauses at 1,000 iterations with Continue if it has not got there.",
    id: "exploitability",
    term: "Exploitability",
    topic: "numbers",
  },
  {
    aliases: ["Exact enumeration"],
    definition:
      "The Equity tool deals every possible runout and counts the results, so the numbers are exact. It does this when the count is small enough, otherwise it uses Monte Carlo.",
    example: "Exact, 1,712,304 runouts",
    id: "exact",
    term: "Exact",
    topic: "numbers",
  },
  {
    aliases: ["Samples"],
    definition:
      "Dealing random runouts many times and averaging the results, when there are too many to count them all. The sample count is shown; the tool keeps dealing until the numbers stop moving by more than a few hundredths of a percent.",
    example: "Monte Carlo, 600,000 samples",
    id: "monte-carlo",
    term: "Monte Carlo",
    topic: "numbers",
  },
  {
    aliases: ["Heuristic verdict"],
    definition:
      "A rule of thumb rather than a solve. The Advisor's postflop verdict is one: facing a bet it calls when your equity beats the price (pushes if the SPR is 2 or less), otherwise folds; first to act it bets when your equity is well above a fair share of the pot, otherwise checks.",
    id: "heuristic",
    term: "Heuristic",
    topic: "numbers",
  },

  // Actions.
  {
    aliases: ["Opener", "Open raise", "Opened"],
    definition:
      "The first raise before the flop when everyone before you has folded. The player who opens is the opener. Open sizes: 2.5bb in the 40bb+ Stack tier, 2bb in the 25bb and 15–20bb tiers.",
    example: "Folded to you on the BTN, you open to 2.5bb.",
    id: "open",
    term: "Open",
    topic: "actions",
  },
  {
    aliases: ["Limper", "Limps", "Open-limp"],
    definition: "Calling the big blind before the flop instead of raising, when nobody has raised yet. A player who limps is a limper. Your Charts only limp from the SB.",
    id: "limp",
    term: "Limp",
    topic: "actions",
  },
  {
    definition: "Limping behind one or more players who have already limped.",
    id: "overlimp",
    term: "Overlimp",
    topic: "actions",
  },
  {
    aliases: ["Iso", "Isolate"],
    definition:
      "Raising after one or more limpers, to play the hand against fewer players. The Advisor sizes it at 3bb plus 1bb per limper (1bb more from the blinds), and all-in in the 15–20bb tier.",
    example: "One limper: iso-raise to 4bb.",
    id: "iso-raise",
    term: "Iso-raise",
    topic: "actions",
  },
  {
    aliases: ["Raise to", "Min-raise"],
    definition:
      "Increasing the bet. The amount is the total you raise to, not the extra. The smallest raise doubles the previous bet. In the Solver the raise size is a multiple of the bet faced.",
    example: "Facing a 2bb bet, a 3× raise is to 6bb.",
    id: "raise",
    term: "Raise",
    topic: "actions",
  },
  {
    aliases: ["3bet", "Three-bet", "Reraise"],
    definition:
      "The re-raise after an open (the blinds count as the first bet, the open as the second). The Advisor 3-bets to 3× the open in position and 4× from the blinds at 40bb+, and all-in at 25bb and below.",
    id: "three-bet",
    term: "3-bet",
    topic: "actions",
  },
  {
    aliases: ["Shove", "Jam", "Pusher", "Pushed"],
    definition:
      "Going all-in (a shove or jam), usually before the flop with a short stack, so there is no decision left after it. Below 15bb your Push/fold charts take over from the raising Charts.",
    id: "push",
    term: "Push",
    topic: "actions",
  },
  {
    aliases: ["All in", "Allin"],
    definition: "Betting, raising or calling with every chip you have left. A player who is all-in cannot be asked for more chips and stays in the hand to showdown.",
    id: "all-in",
    term: "All-in",
    topic: "actions",
  },
  {
    aliases: ["Caller", "Calls"],
    definition: "Matching the current bet to stay in the hand.",
    id: "call",
    term: "Call",
    topic: "actions",
  },
  {
    aliases: ["Folds", "Folded"],
    definition: "Giving up the hand and any chips already in the pot. In the Charts, fold is whatever share of a hand is left after the other actions.",
    id: "fold",
    term: "Fold",
    topic: "actions",
  },
  {
    aliases: ["Checks"],
    definition: "Passing without betting, which is only allowed when nobody has bet yet on the street. The BB can check after limps.",
    id: "check",
    term: "Check",
    topic: "actions",
  },
  {
    aliases: ["Bets"],
    definition: "Putting chips in first on a street after the flop. The Solver gives each bet size as a share of the pot.",
    id: "bet",
    term: "Bet",
    topic: "actions",
  },
  {
    aliases: ["Bet sizes", "Sizing"],
    definition: "How much to bet, as a percentage of the pot. The Solver offers 33% and 75% by default, plus all-in. Flop Spots use one size plus all-in to keep the solve small.",
    example: "A 75% bet into a 10bb pot is 7.5bb.",
    id: "bet-size",
    term: "Bet size",
    topic: "actions",
  },
  {
    definition: "Everyone folds to the big blind, who wins the blinds without playing.",
    id: "walk",
    term: "Walk",
    topic: "actions",
  },

  // Cards and streets.
  {
    definition: "The betting round before any board cards are dealt, when you only have your two hole cards. The Charts cover preflop play.",
    id: "preflop",
    term: "Preflop",
    topic: "cards",
  },
  {
    definition: "Everything after the flop is dealt: the flop, turn and river betting rounds.",
    id: "postflop",
    term: "Postflop",
    topic: "cards",
  },
  {
    definition: "The first three board cards, dealt together, and the betting round that follows.",
    id: "flop",
    term: "Flop",
    topic: "cards",
  },
  {
    definition: "The fourth board card and the betting round after it.",
    id: "turn",
    term: "Turn",
    topic: "cards",
  },
  {
    definition: "The fifth and last board card and the final betting round.",
    id: "river",
    term: "River",
    topic: "cards",
  },
  {
    definition: "One betting round: preflop, flop, turn or river.",
    id: "street",
    term: "Street",
    topic: "cards",
  },
  {
    definition: "The shared cards in the middle of the table, up to five, that every player uses with their own two cards.",
    id: "board",
    term: "Board",
    topic: "cards",
  },
  {
    aliases: ["Runouts"],
    definition: "The board cards still to come, dealt one way. Equity counts or samples every runout.",
    example: "On a flop there are 990 two-card runouts for a heads-up hand.",
    id: "runout",
    term: "Runout",
    topic: "cards",
  },
  {
    definition: "Cards you know are out of play, for example a card flashed by a player who folded. The Equity tool leaves them out of the deck.",
    id: "dead-cards",
    term: "Dead cards",
    topic: "cards",
  },
  {
    definition: "When the betting is over and the remaining players show their hands; the best five-card hand wins the pot.",
    id: "showdown",
    term: "Showdown",
    topic: "cards",
  },

  // Table, stacks and tournament.
  {
    aliases: ["Positions"],
    definition:
      "Where you sit relative to the button, which sets the order you act in. Later Positions act after the others and can play more hands. At an 8-max table: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB.",
    id: "position",
    term: "Position",
    topic: "table",
  },
  {
    abbreviation: "UTG",
    definition: "The first Position to act before the flop, just left of the big blind. Play tight here: everyone else acts after you.",
    id: "utg",
    term: "Under the gun",
    topic: "table",
  },
  {
    abbreviation: "UTG+1",
    definition: "The Position after UTG, second to act before the flop.",
    id: "utg-plus-1",
    term: "Under the gun +1",
    topic: "table",
  },
  {
    abbreviation: "LJ",
    definition: "Lojack, the Position after UTG+1 and three before the button. At a 6-handed table it is the first to act.",
    id: "lj",
    term: "Lojack",
    topic: "table",
  },
  {
    abbreviation: "HJ",
    definition: "Hijack, two Positions before the button.",
    id: "hj",
    term: "Hijack",
    topic: "table",
  },
  {
    abbreviation: "CO",
    definition: "Cutoff, the Position just before the button. One of the best Positions to open from.",
    id: "co",
    term: "Cutoff",
    topic: "table",
  },
  {
    abbreviation: "BTN",
    aliases: ["Dealer", "D"],
    definition: "The dealer Position, marked D on the table. It acts last on every street after the flop, which makes it the best Position at the table.",
    id: "btn",
    term: "Button",
    topic: "table",
  },
  {
    abbreviation: "SB",
    definition: "The small blind: the Position left of the button, which posts the smaller forced bet. It acts first on every street after the flop.",
    id: "sb",
    term: "Small blind",
    topic: "table",
  },
  {
    abbreviation: "BB",
    definition: "The big blind: the Position left of the small blind, which posts the bigger forced bet. It acts last before the flop.",
    id: "big-blind",
    term: "Big blind",
    topic: "table",
  },
  {
    aliases: ["Early", "Opener group", "Pusher group"],
    definition: "UTG and UTG+1. The Charts group openers and pushers as early, middle or late, because how wide they play depends mostly on how many players are left behind them.",
    id: "early-position",
    term: "Early position",
    topic: "table",
  },
  {
    aliases: ["Middle"],
    definition: "LJ and HJ, the middle group of openers and pushers in the Charts.",
    id: "middle-position",
    term: "Middle position",
    topic: "table",
  },
  {
    aliases: ["Late"],
    definition: "CO, BTN and SB, the late group of openers and pushers in the Charts. They open the widest.",
    id: "late-position",
    term: "Late position",
    topic: "table",
  },
  {
    abbreviation: "IP",
    definition: "Acting after your opponent on each street after the flop, so you see what they do first. An advantage.",
    id: "ip",
    term: "In position",
    topic: "table",
  },
  {
    abbreviation: "OOP",
    definition: "Acting before your opponent on each street after the flop. The Solver lists the OOP player first.",
    id: "oop",
    term: "Out of position",
    topic: "table",
  },
  {
    definition: "The forced bets posted before the cards are dealt, by the small blind and the big blind, so there is always something to win.",
    id: "blinds",
    term: "Blinds",
    topic: "table",
  },
  {
    abbreviation: "bb",
    definition: "The unit the app uses for stacks and bets: one bb is one big blind at the current Blind level. It keeps advice the same as the blinds go up.",
    example: "8,000 chips at 200/400 is 20bb.",
    id: "bb",
    term: "Big blinds",
    topic: "table",
  },
  {
    definition: "The tokens you play with. A tournament stack only means something compared with the blinds, so the app turns chips into bb.",
    id: "chips",
    term: "Chips",
    topic: "table",
  },
  {
    definition: "All the chips bet so far in the hand, including the blinds.",
    id: "pot",
    term: "Pot",
    topic: "table",
  },
  {
    definition:
      "One step of the Blind structure, written small blind / big blind in chips. At level 1 (50/50) both blinds are the same, and the app uses the real blinds in its pot maths. The Solver's Preflop line takes a Blind level too.",
    example: "Level 5 is 200/400.",
    id: "blind-level",
    term: "Blind level",
    topic: "table",
  },
  {
    definition:
      "The list of Blind levels and the starting stack of a tournament. The app's default: 10,000 chips; 50/50, 50/100, 100/200, 150/300, 200/400, 300/600, 500/1000, then the blinds keep doubling. No antes.",
    id: "blind-structure",
    term: "Blind structure",
    topic: "table",
  },
  {
    definition: "An extra forced bet everyone posts in some tournaments. Your league plays without antes, so the app leaves them out.",
    id: "ante",
    term: "Ante",
    topic: "table",
  },
  {
    aliases: ["Stack", "Stack size"],
    definition: "Your stack measured in big blinds rather than chips. It decides which Charts apply.",
    example: "6,000 chips at 150/300 is a Stack depth of 20bb.",
    id: "stack-depth",
    term: "Stack depth",
    topic: "table",
  },
  {
    aliases: ["40bb+", "25bb", "15–20bb", "Push/fold"],
    definition:
      "The band of Stack depth whose Charts apply: 33bb and up uses the 40bb+ Charts, 21 to 32bb the 25bb Charts, 15 to 20bb the 15–20bb Charts. Below 15bb the Push/fold charts apply. A depth between bands rounds down.",
    example: "32.5bb uses the 25bb Charts.",
    id: "stack-tier",
    term: "Stack tier",
    topic: "table",
  },
  {
    aliases: ["Behind", "Effective"],
    definition: "The smaller of the two stacks in a heads-up pot: nobody can win or lose more than that. Chips behind are the ones not yet in the pot.",
    example: "You have 30bb and your opponent 12bb: the effective stack is 12bb.",
    id: "effective-stack",
    term: "Effective stack",
    topic: "table",
  },
  {
    aliases: ["Heads up", "HU"],
    definition: "Only two players in the pot. The Solver only takes heads-up Spots.",
    id: "heads-up",
    term: "Heads-up",
    topic: "table",
  },
  {
    aliases: ["8-max", "8-handed", "6-handed"],
    definition: "A table with fewer than eight players. The app plays 8-max: short-handed tables drop the earliest Positions first, so 6-handed is LJ, HJ, CO, BTN, SB, BB.",
    id: "short-handed",
    term: "Short-handed",
    topic: "table",
  },
  {
    abbreviation: "ICM",
    aliases: ["Independent Chip Model"],
    definition:
      "A model that turns tournament stacks into shares of the prize money, so busting costs more than chips. The app leaves it out: it counts chips only (chip EV), which is close enough in freerolls far from the money.",
    id: "icm",
    term: "Independent chip model",
    topic: "table",
  },

  // Hands, ranges and Charts.
  {
    aliases: ["Hand classes", "Starting hand"],
    definition: "One of the 169 different starting hands, ignoring the exact suits: a pair, a suited hand or an offsuit hand. Each is one square of the 13×13 grid.",
    example: "AKs, AKo and 77 are Hand classes.",
    id: "hand-class",
    term: "Hand class",
    topic: "ranges",
  },
  {
    aliases: ["Combos", "Combination"],
    definition: "One exact pair of hole cards. A pair has 6 Combos, a suited hand 4 and an offsuit hand 12: 1,326 in all. Ranges are counted in Combos.",
    example: "A♠K♦ is one of the 12 AKo Combos.",
    id: "combo",
    term: "Combo",
    topic: "ranges",
  },
  {
    aliases: ["s"],
    definition: "Two cards of the same suit, written with an s.",
    example: "AKs: ace and king of the same suit.",
    id: "suited",
    term: "Suited",
    topic: "ranges",
  },
  {
    aliases: ["o"],
    definition: "Two cards of different suits, written with an o.",
    example: "AKo: ace and king of different suits.",
    id: "offsuit",
    term: "Offsuit",
    topic: "ranges",
  },
  {
    aliases: ["Pair", "Pairs"],
    definition: "Two hole cards of the same rank. Pairs run down the diagonal of the 13×13 grid.",
    example: "77",
    id: "pocket-pair",
    term: "Pocket pair",
    topic: "ranges",
  },
  {
    aliases: ["Random"],
    definition: "Any starting hand at all. In the Equity tool, a Random player holds any two cards.",
    id: "any-two-cards",
    term: "Any two cards",
    topic: "ranges",
  },
  {
    aliases: ["13x13 grid", "Grid", "Hand grid"],
    definition: "All 169 Hand classes in a square: pairs on the diagonal, suited hands above it, offsuit hands below. Each square shows how the hand is played, split by colour.",
    id: "hand-grid",
    term: "13×13 grid",
    topic: "ranges",
  },
  {
    aliases: ["Ranges"],
    definition: "All the hands a player could have at a point in the hand, each with a weight. You put opponents on a Range rather than on one hand.",
    example: "A tight UTG open Range: 88+, AJs+, KQs, AQo+.",
    id: "range",
    term: "Range",
    topic: "ranges",
  },
  {
    definition:
      "A Range written as text, a comma-separated list of hands. The Equity and Solver range editors accept it, and the Ranges scratchpad copies one to paste into a Chart file.",
    example: "22+, A2s+, KTs+, AJo+, KQo, ATo:0.5",
    id: "range-string",
    term: "Range string",
    topic: "ranges",
  },
  {
    aliases: ["Notation"],
    definition:
      "How range strings are written. + means this hand and better: 22+ is every pair, A2s+ is A2s to AKs. A dash is a span: KTs-K8s. :0.5 plays a hand half the time. An exact Combo is written with suits: AsKd.",
    id: "range-notation",
    term: "Range notation",
    topic: "ranges",
  },
  {
    aliases: ["Frequency", "Mixed", "Mix"],
    definition: "How often a Hand class takes each action. Some hands are mixed: they raise part of the time and fold the rest, which keeps you hard to read.",
    example: "AJo: raise 70%, fold 30%.",
    id: "action-frequency",
    term: "Action frequency",
    topic: "ranges",
  },
  {
    aliases: ["Charts"],
    definition:
      "A preflop strategy for one Position, Stack tier and Situation: what every Hand class does, with its Action frequencies. Your Charts live in the app's files and show in the Ranges tool.",
    example: "BB vs late open, 25bb.",
    id: "chart",
    term: "Chart",
    topic: "ranges",
  },
  {
    definition: "A Chart marked as a starting point that has not yet been tuned to your games. The Ranges tool and the Advisor say so.",
    id: "baseline",
    term: "Baseline",
    topic: "ranges",
  },
  {
    aliases: ["Situations"],
    definition: "What happened before you acted, which picks the Chart: Open (folded to you), Vs open, Vs limpers, or with a short stack Push and Vs push.",
    id: "situation",
    term: "Situation",
    topic: "ranges",
  },
  {
    definition: "The Situation where one player has opened and you decide to 3-bet, call or fold. The Chart depends on whether the opener is in early, middle or late position.",
    id: "vs-open",
    term: "Vs open",
    topic: "ranges",
  },
  {
    definition:
      "The Situation where one or more players have limped and nobody has raised: iso-raise, overlimp or fold. The Charts split 1 limper from 2 or more. The BB facing an SB limp uses it too, and checks instead of folding.",
    id: "vs-limpers",
    term: "Vs limpers",
    topic: "ranges",
  },
  {
    definition:
      "The Situation where a short-stacked player has pushed all-in and everyone between has folded: call or fold. The pusher is grouped as early, middle or late, and the chart averages the calls against each pusher in the group.",
    id: "vs-push",
    term: "Vs push",
    topic: "ranges",
  },
  {
    aliases: ["Push/fold charts", "Push chart", "Push charts"],
    definition:
      "Charts for stacks below 15bb, where the only plays are all-in or fold (Push), or call the all-in or fold (Vs push). The Ranges tool shows the largest stack at which each hand still pushes or calls; 15+ means at every depth.",
    id: "push-fold-chart",
    term: "Push/fold chart",
    topic: "ranges",
  },

  // Player types.
  {
    aliases: ["Player types"],
    definition: "A preset for how an opponent plays before the flop: Tight, Standard or Loose. The Advisor uses it to estimate their Range from what they did preflop.",
    id: "player-type",
    term: "Player type",
    topic: "player-types",
  },
  {
    definition: "Plays few hands and mostly raises them; rarely limps or calls light. Their Range is strong when they put money in.",
    id: "tight",
    term: "Tight",
    topic: "player-types",
  },
  {
    definition: "Plays like your own Charts. A sensible default when you know nothing about a player.",
    id: "standard",
    term: "Standard",
    topic: "player-types",
  },
  {
    definition: "The passive, wide bar player: raises only strong hands but limps and calls with a lot, from any Position. Their Range is wide and full of weak hands.",
    id: "loose",
    term: "Loose",
    topic: "player-types",
  },

  // Solver and theory.
  {
    abbreviation: "GTO",
    definition: "A strategy no opponent can beat in the long run, however they play. It does not try to exploit anyone's mistakes. The Solver works one out for a single Spot.",
    id: "gto",
    term: "Game theory optimal",
    topic: "solver",
  },
  {
    aliases: ["Nash", "Equilibrium"],
    definition: "A pair of strategies where neither player can gain by changing theirs alone. Your Push/fold charts are a Nash equilibrium, worked out by the app's own script.",
    id: "nash-equilibrium",
    term: "Nash equilibrium",
    topic: "solver",
  },
  {
    aliases: ["Chip-EV", "cEV"],
    definition: "Counting a play's value in chips, as if every chip were worth the same. The Push/fold charts and the Solver use chip EV, not ICM.",
    id: "chip-ev",
    term: "Chip EV",
    topic: "solver",
  },
  {
    abbreviation: "CFR",
    aliases: ["DCFR", "Discounted CFR"],
    definition:
      "Counterfactual regret minimisation, the method the Solver uses. It plays the Spot against itself over and over, and each time leans toward the actions it regrets not taking more.",
    id: "cfr",
    term: "Counterfactual regret minimisation",
    topic: "solver",
  },
  {
    aliases: ["Iterations"],
    definition: "One pass of the Solver through the whole game tree. Each pass improves the strategy a little; the Solver shows the count as it goes.",
    id: "iteration",
    term: "Iteration",
    topic: "solver",
  },
  {
    aliases: ["Spots"],
    definition:
      "The postflop situation you give the Solver: two Ranges, a board, the pot, the effective stack and the allowed bet sizes. Turn and river Spots are the quick ones; flop Spots are slow and limited.",
    id: "spot",
    term: "Spot",
    topic: "solver",
  },
  {
    definition:
      "The preflop action that led to the Spot. In the Solver it fills both Ranges from your Charts and works out the pot and stacks, with the real blinds of the Blind level you pick.",
    example: "CO opens 2.5bb, BB calls, 40bb.",
    id: "preflop-line",
    term: "Preflop line",
    topic: "solver",
  },
  {
    aliases: ["Tree", "Node", "Decision", "Chance card"],
    definition:
      "Every way the hand can go from the Spot: each decision and its actions, and each turn or river card. In the Solver's results you walk down it by tapping actions and picking cards.",
    id: "game-tree",
    term: "Game tree",
    topic: "solver",
  },
  {
    aliases: ["Strategies"],
    definition: "How a player plays every hand in their Range at one decision, including the mixes. The Solver's grid shows the strategy of the player to act.",
    id: "strategy",
    term: "Strategy",
    topic: "solver",
  },
];
