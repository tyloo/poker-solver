import type { GlossaryTranslation } from "@/lib/glossary/glossary";

/**
 * French text of the Glossary, keyed by the English term's `id` (content/glossary.ts keeps the anchors,
 * topics and order). Every English term needs an entry; lib/glossary tests check it. The English names
 * stay searchable in French. Write plain spaces: no-break spaces before ":" ";" "?" "!" are added on load.
 */
export const GLOSSARY_FR: Readonly<Record<string, GlossaryTranslation>> = {
  // Les chiffres des outils.
  equity: {
    aliases: ["Ton équité"],
    definition:
      "Ta part du pot si toutes les cartes étaient distribuées sans autre mise : la fréquence à laquelle tu gagnes, plus la moitié de tes égalités (un tiers pour une égalité à trois, etc.).",
    example: "AA a environ 82 % d’équité contre KK avant le flop.",
    term: "Équité",
  },
  "win-and-tie": {
    aliases: ["Gagne", "Partage", "Victoire", "Égalité"],
    definition:
      "Gagne, c’est la fréquence à laquelle une main remporte tout le pot au showdown. Partage, la fréquence à laquelle elle le partage avec un ou plusieurs joueurs. L’outil Équité affiche les deux sous l’équité de chaque joueur.",
    term: "Gagne et partage",
  },
  "pot-odds": {
    aliases: ["Cote"],
    definition: "Le prix d’un call : le pot que tu peux gagner, mise comprise, face à ce que coûte le call. Le Conseil l’affiche sous forme de rapport.",
    example: "100 au pot et une mise de 50 : tu payes 50 pour en gagner 150, la cote du pot est donc de 3 : 1.",
    term: "Cote du pot",
  },
  "required-equity": {
    aliases: ["Prix"],
    definition: "L’équité dont un call a besoin pour être rentable : le call divisé par le pot final. Au-dessus, le call gagne des jetons sur la durée ; en dessous, couche-toi.",
    example: "Payer 50 pour un pot final de 200 demande 25 % d’équité.",
    term: "Équité requise",
  },
  spr: {
    definition:
      "Ton stack restant divisé par le pot au début de la street. Avec un SPR bas, tu es déjà presque à tapis : une grosse main doit mettre ses jetons au milieu. Le Conseil pushe au lieu de caller quand le SPR est de 2 ou moins.",
    example: "1 000 derrière avec un pot de 500, c’est un SPR de 2.",
    term: "Rapport stack/pot",
  },
  ev: {
    aliases: ["Espérance"],
    definition:
      "Ce qu’un coup gagne ou perd en moyenne sur un grand nombre d’essais. Le Solveur donne l’EV de chaque main en bb : les jetons qu’elle compte prendre au pot à partir d’ici, moins ce qu’elle doit encore y mettre.",
    term: "Espérance de gain",
  },
  exploitability: {
    definition:
      "Ce qu’une contre-stratégie parfaite gagnerait face à la stratégie actuelle du Solveur, en part du pot. Elle baisse au fil du calcul. Le Solveur s’arrête à 0,5 % du pot ou moins, et fait une pause à 1 000 itérations (Continuer) s’il n’y est pas.",
    term: "Exploitabilité",
  },
  exact: {
    aliases: ["Calcul exact"],
    definition:
      "L’outil Équité distribue tous les tirages possibles et compte les résultats : les chiffres sont exacts. Il le fait quand le nombre reste raisonnable, sinon il passe en Monte-Carlo.",
    example: "Exact sur 1 712 304 tirages",
    term: "Exact",
  },
  "monte-carlo": {
    aliases: ["Simulations", "Monte Carlo"],
    definition:
      "Distribuer des tirages au hasard un grand nombre de fois et faire la moyenne, quand il y en a trop pour tous les compter. Le nombre de simulations est affiché ; l’outil continue jusqu’à ce que les chiffres ne bougent plus que de quelques centièmes de pourcent.",
    example: "Monte-Carlo sur 600 000 simulations",
    term: "Monte-Carlo",
  },
  heuristic: {
    aliases: ["Verdict heuristique"],
    definition:
      "Une règle empirique, pas un calcul du solveur. Le verdict postflop du Conseil en est une : face à une mise, il calle si ton équité bat la cote (pushe si le SPR est de 2 ou moins), sinon il se couche ; premier à parler, il mise si ton équité dépasse nettement ta part du pot, sinon il checke.",
    term: "Heuristique",
  },

  // Actions.
  open: {
    aliases: ["Ouvreur", "Ouvrir", "Open raise", "A ouvert"],
    definition:
      "La première relance préflop quand tous les joueurs avant toi se sont couchés. Le joueur qui ouvre est l’ouvreur. Tailles d’open : 2,5bb avec les charts 40bb+, 2bb avec les charts 25bb et 15–20bb.",
    example: "Couché jusqu’à toi au BTN : tu ouvres à 2,5bb.",
    term: "Open",
  },
  limp: {
    aliases: ["Limper", "Limpeur", "Open-limp"],
    definition: "Payer la grosse blinde préflop au lieu de relancer, quand personne n’a encore relancé. Le joueur qui limpe est un limper. Tes charts ne limpent que depuis la SB.",
    term: "Limp",
  },
  overlimp: {
    definition: "Limper derrière un ou plusieurs joueurs qui ont déjà limpé.",
    term: "Overlimp",
  },
  "iso-raise": {
    aliases: ["Iso", "Isoler", "Isolation", "Iso-relance"],
    definition:
      "Relancer après un ou plusieurs limpers pour jouer le coup contre moins d’adversaires. Le Conseil relance à 3bb plus 1bb par limper (1bb de plus depuis les blindes), et à tapis avec les charts 15–20bb.",
    example: "Un limper : isole à 4bb.",
    term: "Isoler",
  },
  raise: {
    aliases: ["Relance", "Relancer à", "Min-raise"],
    definition:
      "Augmenter la mise. Le montant est le total auquel tu relances, pas le supplément. La plus petite relance double la mise précédente. Dans le Solveur, la taille de relance est un multiple de la mise à payer.",
    example: "Face à une mise de 2bb, une relance 3× va à 6bb.",
    term: "Relancer",
  },
  "three-bet": {
    aliases: ["3bet", "Sur-relance"],
    definition:
      "La relance qui suit un open (les blindes comptent comme première mise, l’open comme deuxième). Le Conseil 3-bet à 3× l’open en position et 4× depuis les blindes à 40bb+, et à tapis à 25bb et moins.",
    term: "3-bet",
  },
  push: {
    aliases: ["Shove", "Jam", "Pusher", "Pushé"],
    definition:
      "Partir à tapis (shove ou jam), en général préflop avec un petit stack, pour qu’il ne reste plus aucune décision ensuite. Sous 15bb, tes charts push/fold prennent le relais des charts de relance.",
    term: "Push",
  },
  "all-in": {
    aliases: ["Tapis", "Faire tapis", "All in"],
    definition: "Miser, relancer ou caller avec tous tes jetons restants. Un joueur à tapis ne peut plus rien payer et reste dans le coup jusqu’au showdown.",
    term: "All-in",
  },
  call: {
    aliases: ["Caller", "Payer", "Suivre"],
    definition: "Égaliser la mise en cours pour rester dans le coup.",
    term: "Call",
  },
  fold: {
    aliases: ["Se coucher", "Folder", "Couché"],
    definition: "Abandonner le coup et les jetons déjà mis au pot. Dans les charts, le fold est la part d’une main qui reste après les autres actions.",
    term: "Fold",
  },
  check: {
    aliases: ["Checker", "Parole"],
    definition: "Passer sans miser, ce qui n’est possible que si personne n’a encore misé sur la street. La BB peut checker après des limps.",
    term: "Check",
  },
  bet: {
    aliases: ["Miser", "Bet"],
    definition: "Mettre des jetons en premier sur une street après le flop. Le Solveur donne chaque taille de mise en part du pot.",
    term: "Mise",
  },
  "bet-size": {
    aliases: ["Tailles de mise", "Sizing"],
    definition:
      "Combien miser, en pourcentage du pot. Le Solveur propose 33 % et 75 % par défaut, plus le tapis. Les spots au flop utilisent une seule taille plus le tapis pour garder un calcul léger.",
    example: "Une mise de 75 % dans un pot de 10bb fait 7,5bb.",
    term: "Taille de mise",
  },
  walk: {
    definition: "Tout le monde se couche jusqu’à la grosse blinde, qui remporte les blindes sans jouer.",
    term: "Walk",
  },

  // Cartes et streets.
  preflop: {
    definition: "Le tour d’enchères avant toute carte du board, quand tu n’as que tes deux cartes. Les charts couvrent le jeu préflop.",
    term: "Préflop",
  },
  postflop: {
    definition: "Tout ce qui suit la distribution du flop : les tours d’enchères du flop, de la turn et de la river.",
    term: "Postflop",
  },
  flop: {
    definition: "Les trois premières cartes du board, distribuées ensemble, et le tour d’enchères qui suit.",
    term: "Flop",
  },
  turn: {
    definition: "La quatrième carte du board et le tour d’enchères qui suit.",
    term: "Turn",
  },
  river: {
    definition: "La cinquième et dernière carte du board, et le dernier tour d’enchères.",
    term: "River",
  },
  street: {
    aliases: ["Tour d’enchères"],
    definition: "Un tour d’enchères : préflop, flop, turn ou river.",
    term: "Street",
  },
  board: {
    aliases: ["Tableau"],
    definition: "Les cartes communes au milieu de la table, jusqu’à cinq, que chaque joueur combine avec ses deux cartes.",
    term: "Board",
  },
  runout: {
    aliases: ["Tirages", "Tirage"],
    definition: "Les cartes du board encore à venir, distribuées d’une certaine façon. L’outil Équité compte ou échantillonne tous les tirages.",
    example: "Sur un flop, une main heads-up a 990 tirages de deux cartes.",
    term: "Runout",
  },
  "dead-cards": {
    definition: "Des cartes dont tu sais qu’elles sont hors jeu, par exemple une carte montrée par un joueur qui s’est couché. L’outil Équité les retire du paquet.",
    term: "Cartes mortes",
  },
  showdown: {
    aliases: ["Abattage"],
    definition: "Quand les enchères sont finies et que les joueurs restants montrent leurs cartes ; la meilleure main de cinq cartes remporte le pot.",
    term: "Showdown",
  },

  // Table, stacks et tournoi.
  position: {
    aliases: ["Positions"],
    definition:
      "Où tu te trouves par rapport au bouton, ce qui fixe l’ordre de parole. Les positions tardives parlent après les autres et peuvent jouer plus de mains. À une table 8-max : UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB.",
    term: "Position",
  },
  utg: {
    definition: "La première position à parler préflop, juste à gauche de la grosse blinde. Joue serré ici : tous les autres parlent après toi.",
    term: "Under the gun",
  },
  "utg-plus-1": {
    definition: "La position après UTG, deuxième à parler préflop.",
    term: "Under the gun +1",
  },
  lj: {
    definition: "Lojack, la position après UTG+1, trois positions avant le bouton. À une table à 6, c’est elle qui parle en premier.",
    term: "Lojack",
  },
  hj: {
    definition: "Hijack, deux positions avant le bouton.",
    term: "Hijack",
  },
  co: {
    definition: "Cutoff, la position juste avant le bouton. L’une des meilleures positions pour ouvrir.",
    term: "Cutoff",
  },
  btn: {
    aliases: ["Bouton", "Donneur", "Dealer", "D"],
    definition: "La position du donneur, marquée D sur la table. Elle parle en dernier sur chaque street après le flop, ce qui en fait la meilleure position de la table.",
    term: "Bouton",
  },
  sb: {
    aliases: ["Petite blinde"],
    definition: "La petite blinde : la position à gauche du bouton, qui pose la plus petite mise forcée. Elle parle en premier sur chaque street après le flop.",
    term: "Small blind",
  },
  "big-blind": {
    aliases: ["Grosse blinde"],
    definition: "La grosse blinde : la position à gauche de la petite blinde, qui pose la plus grosse mise forcée. Elle parle en dernier préflop.",
    term: "Big blind",
  },
  "early-position": {
    aliases: ["Début de parole", "Position précoce", "Early", "Groupe d’ouvreurs", "Groupe de pushers"],
    definition:
      "UTG et UTG+1. Les charts regroupent ouvreurs et pushers en début, milieu ou fin de parole, car leur range dépend surtout du nombre de joueurs encore à parler derrière eux.",
    term: "Début de parole",
  },
  "middle-position": {
    aliases: ["Milieu", "Middle position"],
    definition: "LJ et HJ, le groupe du milieu pour les ouvreurs et les pushers dans les charts.",
    term: "Milieu de parole",
  },
  "late-position": {
    aliases: ["Fin", "Position tardive", "Late position"],
    definition: "CO, BTN et SB, le groupe de fin de parole pour les ouvreurs et les pushers dans les charts. Ce sont eux qui ouvrent le plus large.",
    term: "Fin de parole",
  },
  ip: {
    aliases: ["En position"],
    definition: "Parler après ton adversaire sur chaque street après le flop, donc voir ce qu’il fait avant toi. Un avantage.",
    term: "In position",
  },
  oop: {
    aliases: ["Hors de position"],
    definition: "Parler avant ton adversaire sur chaque street après le flop. Le Solveur affiche le joueur OOP en premier.",
    term: "Out of position",
  },
  blinds: {
    definition: "Les mises forcées posées avant la distribution par la petite et la grosse blinde, pour qu’il y ait toujours quelque chose à gagner.",
    term: "Blindes",
  },
  bb: {
    aliases: ["Big blinds"],
    definition:
      "L’unité de l’app pour les stacks et les mises : une bb vaut une grosse blinde au niveau de blindes en cours. Les conseils restent ainsi les mêmes quand les blindes montent.",
    example: "8 000 jetons à 200/400, c’est 20bb.",
    term: "Grosses blindes",
  },
  chips: {
    definition: "Ce avec quoi tu joues. En tournoi, un stack ne veut rien dire sans les blindes : l’app convertit donc les jetons en bb.",
    term: "Jetons",
  },
  pot: {
    definition: "Tous les jetons misés jusqu’ici dans le coup, blindes comprises.",
    term: "Pot",
  },
  "blind-level": {
    aliases: ["Niveau"],
    definition:
      "Une étape de la structure de blindes, notée petite blinde / grosse blinde en jetons. Au niveau 1 (50/50), les deux blindes sont égales, et l’app utilise les vraies blindes dans ses calculs de pot. La ligne préflop du Solveur prend aussi un niveau.",
    example: "Le niveau 5, c’est 200/400.",
    term: "Niveau de blindes",
  },
  "blind-structure": {
    definition:
      "La liste des niveaux de blindes et le tapis de départ d’un tournoi. Par défaut dans l’app : 10 000 jetons ; 50/50, 50/100, 100/200, 150/300, 200/400, 300/600, 500/1000, puis les blindes doublent. Sans ante.",
    term: "Structure de blindes",
  },
  ante: {
    definition: "Une mise forcée en plus que tout le monde pose dans certains tournois. Ta ligue joue sans ante, donc l’app n’en tient pas compte.",
    term: "Ante",
  },
  "stack-depth": {
    aliases: ["Stack", "Taille de stack", "Profondeur"],
    definition: "Ton stack compté en grosses blindes plutôt qu’en jetons. C’est lui qui décide des charts à utiliser.",
    example: "6 000 jetons à 150/300, c’est une profondeur de 20bb.",
    term: "Profondeur de stack",
  },
  "stack-tier": {
    aliases: ["40bb+", "25bb", "15–20bb", "Push/fold", "Tranche"],
    definition:
      "La tranche de profondeur qui choisit les charts : 33bb et plus, les charts 40bb+ ; de 21 à 32bb, les charts 25bb ; de 15 à 20bb, les charts 15–20bb. Sous 15bb, les charts push/fold. Entre deux tranches, on arrondit vers le bas.",
    example: "32,5bb utilise les charts 25bb.",
    term: "Tranche de stack",
  },
  "effective-stack": {
    aliases: ["Derrière", "Effectif"],
    definition: "Le plus petit des deux stacks dans un pot heads-up : personne ne peut gagner ou perdre plus. Les jetons derrière sont ceux qui ne sont pas encore au pot.",
    example: "Tu as 30bb et ton adversaire 12bb : le stack effectif est de 12bb.",
    term: "Stack effectif",
  },
  "heads-up": {
    aliases: ["Heads up", "HU"],
    definition: "Seulement deux joueurs dans le pot. Le Solveur ne traite que les spots heads-up.",
    term: "Heads-up",
  },
  "short-handed": {
    aliases: ["8-max", "Table à 8", "Table à 6"],
    definition:
      "Une table de moins de huit joueurs. L’app joue en 8-max : les tables incomplètes retirent d’abord les premières positions, donc à 6 il reste LJ, HJ, CO, BTN, SB, BB.",
    term: "Short-handed",
  },
  icm: {
    aliases: ["Independent Chip Model"],
    definition:
      "Un modèle qui convertit les stacks de tournoi en parts du prize pool, si bien que sauter coûte plus que des jetons. L’app ne l’utilise pas : elle ne compte que les jetons (chip EV), ce qui suffit en freeroll loin de l’argent.",
    term: "Modèle ICM",
  },

  // Mains, ranges et charts.
  "hand-class": {
    aliases: ["Classes de main", "Main de départ"],
    definition: "L’une des 169 mains de départ, sans tenir compte des couleurs exactes : une paire, une main suited ou une main offsuit. Chacune est une case de la grille 13×13.",
    example: "AKs, AKo et 77 sont des classes de main.",
    term: "Classe de main",
  },
  combo: {
    aliases: ["Combos", "Combinaison"],
    definition: "Une paire exacte de cartes. Une paire compte 6 combos, une main suited 4 et une main offsuit 12 : 1 326 en tout. Les ranges se comptent en combos.",
    example: "A♠K♦ est l’un des 12 combos de AKo.",
    term: "Combo",
  },
  suited: {
    aliases: ["s", "Assorties"],
    definition: "Deux cartes de la même couleur, notées avec un s.",
    example: "AKs : as et roi de la même couleur.",
    term: "Suited",
  },
  offsuit: {
    aliases: ["o", "Dépareillées"],
    definition: "Deux cartes de couleurs différentes, notées avec un o.",
    example: "AKo : as et roi de couleurs différentes.",
    term: "Offsuit",
  },
  "pocket-pair": {
    aliases: ["Paire", "Paires", "Pocket pair"],
    definition: "Deux cartes de même hauteur en main. Les paires occupent la diagonale de la grille 13×13.",
    example: "77",
    term: "Paire servie",
  },
  "any-two-cards": {
    aliases: ["Hasard", "Any two"],
    definition: "N’importe quelle main de départ. Dans l’outil Équité, un joueur « Hasard » tient deux cartes quelconques.",
    term: "Deux cartes au hasard",
  },
  "hand-grid": {
    aliases: ["Grille 13x13", "Grille"],
    definition:
      "Les 169 classes de main dans un carré : les paires sur la diagonale, les mains suited au-dessus, les offsuit en dessous. Chaque case montre comment la main se joue, découpée par couleur.",
    term: "Grille 13×13",
  },
  range: {
    aliases: ["Ranges", "Fourchette"],
    definition: "Toutes les mains qu’un joueur peut avoir à un moment du coup, chacune avec un poids. On met un adversaire sur une range plutôt que sur une seule main.",
    example: "Une range d’open UTG serrée : 88+, AJs+, KQs, AQo+.",
    term: "Range",
  },
  "range-string": {
    aliases: ["Range string"],
    definition:
      "Une range écrite en texte : une liste de mains séparées par des virgules. Les éditeurs de range de l’Équité et du Solveur l’acceptent, et le brouillon des Ranges en copie une à coller dans un fichier de chart.",
    example: "22+, A2s+, KTs+, AJo+, KQo, ATo:0.5",
    term: "Range en texte",
  },
  "range-notation": {
    aliases: ["Notation"],
    definition:
      "La façon d’écrire une range. + veut dire cette main et mieux : 22+ couvre toutes les paires, A2s+ va de A2s à AKs. Un tiret donne un intervalle : KTs-K8s. :0.5 joue la main une fois sur deux. Un combo exact s’écrit avec ses couleurs : AsKd.",
    term: "Notation des ranges",
  },
  "action-frequency": {
    aliases: ["Fréquence", "Mixte", "Mix"],
    definition:
      "La fréquence à laquelle une classe de main prend chaque action. Certaines mains sont mixtes : elles relancent une partie du temps et se couchent le reste, ce qui te rend difficile à lire.",
    example: "AJo : relancer 70 %, se coucher 30 %.",
    term: "Fréquence d’action",
  },
  chart: {
    aliases: ["Charts", "Tableau préflop"],
    definition:
      "Une stratégie préflop pour une position, une tranche de stack et une situation : ce que fait chaque classe de main, avec ses fréquences. Tes charts sont dans les fichiers de l’app et s’affichent dans l’outil Ranges.",
    example: "BB face à un open en fin de parole, 25bb.",
    term: "Chart",
  },
  baseline: {
    aliases: ["Baseline", "Par défaut"],
    definition: "Une chart marquée comme point de départ, pas encore ajustée à tes parties. L’outil Ranges et le Conseil le signalent.",
    term: "Chart par défaut",
  },
  situation: {
    aliases: ["Situations"],
    definition: "Ce qui s’est passé avant toi, qui choisit la chart : Open (couché jusqu’à toi), face à un open, face aux limpers, ou avec un petit stack Push et face à un push.",
    term: "Situation",
  },
  "vs-open": {
    aliases: ["Vs open"],
    definition: "La situation où un joueur a ouvert et où tu choisis entre 3-bet, call et fold. La chart dépend de la position de l’ouvreur : début, milieu ou fin de parole.",
    term: "Face à un open",
  },
  "vs-limpers": {
    aliases: ["Vs limpers"],
    definition:
      "La situation où un ou plusieurs joueurs ont limpé sans relance : isoler, overlimper ou se coucher. Les charts séparent 1 limper de 2 ou plus. La BB face à un limp de la SB l’utilise aussi, et checke au lieu de se coucher.",
    term: "Face aux limpers",
  },
  "vs-push": {
    aliases: ["Vs push"],
    definition:
      "La situation où un petit stack a pushé et où tous les joueurs entre vous se sont couchés : call ou fold. Le pusher est classé en début, milieu ou fin de parole, et la chart fait la moyenne des calls contre chaque pusher du groupe.",
    term: "Face à un push",
  },
  "push-fold-chart": {
    aliases: ["Charts push/fold", "Chart de push", "Charts de push"],
    definition:
      "Les charts sous 15bb, où l’on ne peut que partir à tapis ou se coucher (Push), ou payer le tapis ou se coucher (face à un push). L’outil Ranges montre le plus gros stack où chaque main pushe ou calle encore ; 15+ veut dire à toutes les profondeurs.",
    term: "Chart push/fold",
  },

  // Profils de joueurs.
  "player-type": {
    aliases: ["Profils", "Type de joueur"],
    definition: "Un réglage qui décrit le jeu préflop d’un adversaire : Serré, Standard ou Large. Le Conseil s’en sert pour estimer sa range d’après ce qu’il a fait préflop.",
    term: "Profil de joueur",
  },
  tight: {
    aliases: ["Tight"],
    definition: "Joue peu de mains et les relance surtout ; limpe ou calle rarement léger. Sa range est forte quand il met de l’argent.",
    term: "Serré",
  },
  standard: {
    definition: "Joue comme tes propres charts. Un bon choix par défaut quand tu ne sais rien d’un joueur.",
    term: "Standard",
  },
  loose: {
    aliases: ["Loose"],
    definition:
      "Le joueur de bar passif et large : ne relance que ses grosses mains mais limpe et calle beaucoup, depuis n’importe quelle position. Sa range est large et pleine de mains faibles.",
    term: "Large",
  },

  // Solveur et théorie.
  gto: {
    aliases: ["Optimal"],
    definition:
      "Une stratégie qu’aucun adversaire ne peut battre sur la durée, quoi qu’il fasse. Elle ne cherche pas à exploiter les erreurs des autres. Le Solveur en calcule une pour un seul spot.",
    term: "Optimal en théorie des jeux",
  },
  "nash-equilibrium": {
    aliases: ["Nash", "Équilibre"],
    definition: "Une paire de stratégies où aucun joueur ne gagne à changer la sienne seul. Tes charts push/fold sont un équilibre de Nash, calculé par le script de l’app.",
    term: "Équilibre de Nash",
  },
  "chip-ev": {
    aliases: ["Chip-EV", "cEV"],
    definition: "Mesurer la valeur d’un coup en jetons, comme si chaque jeton valait la même chose. Les charts push/fold et le Solveur utilisent la chip EV, pas l’ICM.",
    term: "Chip EV",
  },
  cfr: {
    aliases: ["DCFR", "Discounted CFR"],
    definition:
      "La minimisation du regret contrefactuel, la méthode du Solveur. Il joue le spot contre lui-même encore et encore, et penche chaque fois un peu plus vers les actions qu’il regrette de ne pas avoir prises.",
    term: "Minimisation du regret contrefactuel",
  },
  iteration: {
    aliases: ["Itérations"],
    definition: "Un passage du Solveur sur tout l’arbre de jeu. Chaque passage améliore un peu la stratégie ; le Solveur affiche le compte au fur et à mesure.",
    term: "Itération",
  },
  spot: {
    aliases: ["Spots"],
    definition:
      "La situation postflop que tu donnes au Solveur : deux ranges, un board, le pot, le stack effectif et les tailles de mise permises. Les spots turn et river sont rapides ; ceux du flop sont lents et limités.",
    term: "Spot",
  },
  "preflop-line": {
    aliases: ["Ligne", "Preflop line"],
    definition:
      "L’action préflop qui mène au spot. Dans le Solveur, elle remplit les deux ranges depuis tes charts et calcule le pot et les stacks, avec les vraies blindes du niveau choisi.",
    example: "CO ouvre à 2,5bb, BB calle, 40bb.",
    term: "Ligne préflop",
  },
  "game-tree": {
    aliases: ["Arbre", "Nœud", "Décision", "Carte de la turn", "Carte de la river"],
    definition:
      "Toutes les façons dont le coup peut se jouer depuis le spot : chaque décision avec ses actions, et chaque carte de turn ou de river. Dans les résultats du Solveur, tu le parcours en touchant les actions et en choisissant les cartes.",
    term: "Arbre de jeu",
  },
  strategy: {
    aliases: ["Stratégies"],
    definition: "La façon dont un joueur joue chaque main de sa range à une décision, mixtes comprises. La grille du Solveur montre la stratégie du joueur qui parle.",
    term: "Stratégie",
  },
};
