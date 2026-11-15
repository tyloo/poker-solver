import type { Release } from "@/lib/changelog";

/**
 * Release notes, newest first. The app shows them in both languages; `pnpm changelog` writes CHANGELOG.md from the English text.
 * Inline `**bold**` and `` `code` `` are allowed. The first release's version is the app version (`package.json` must match).
 */
export const RELEASES: readonly Release[] = [
  {
    changes: {
      added: [
        {
          en: "The app version next to the language switch. Tap it to read what's new in each release, in English or French.",
          fr: "La version de l’app à côté du choix de langue. Touche-la pour lire les nouveautés de chaque version, en français ou en anglais.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.8.0",
  },
  {
    changes: {
      added: [
        {
          en: '"Solve anyway" for Spots above the phone\'s safe limit, up to a 2 GB cap, with a warning that the page may crash. The setup stays in the URL, so a crash only loses the solve.',
          fr: "« Résoudre quand même » pour les spots au-delà de la limite sûre du téléphone, jusqu’à 2 Go, avec un avertissement : la page peut planter. Ta configuration reste dans l’URL, donc un plantage ne fait perdre que le calcul.",
        },
      ],
      changed: [
        {
          en: "The Solver's memory limit now follows the phone: 1 GB on Android phones that report 8 GB of RAM, 700 MB on iPhones and phones that don't report their RAM, and 400 MB on phones with 2 GB or less (previously 400 MB for every phone).",
          fr: "La limite de mémoire du solveur suit maintenant le téléphone : 1 Go sur les Android qui annoncent 8 Go de RAM, 700 Mo sur iPhone et sur les téléphones qui n’annoncent pas leur RAM, et 400 Mo à partir de 2 Go ou moins (avant : 400 Mo pour tous).",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.7.0",
  },
  {
    changes: {
      added: [
        {
          en: 'A "new version is ready" banner with Refresh and Later. The app checks for updates whenever it comes back to the foreground.',
          fr: "Un bandeau « nouvelle version prête » avec Actualiser et Plus tard. L’app vérifie les mises à jour à chaque retour au premier plan.",
        },
      ],
      changed: [
        {
          en: "A new version of the service worker now waits for the Refresh tap instead of taking over open pages, so a page never mixes old and new files.",
          fr: "Une nouvelle version du service worker attend maintenant le bouton Actualiser au lieu de prendre la main sur les pages ouvertes, pour qu’une page ne mélange jamais anciens et nouveaux fichiers.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.6.0",
  },
  {
    changes: {
      added: [
        {
          en: "An invitation to add the app to the home screen on phones: a one-tap install on Android Chrome, step-by-step instructions on iOS and other Android browsers. Dismissing it stores a single flag so it never comes back.",
          fr: "Une invitation à ajouter l’app à l’écran d’accueil sur téléphone : installation en un geste sur Chrome Android, instructions pas à pas sur iOS et les autres navigateurs Android. La fermer enregistre un seul indicateur pour qu’elle ne revienne pas.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.5.0",
  },
  {
    changes: {
      added: [
        {
          en: "Page-view counting with Vercel Web Analytics (no cookies). The service worker leaves analytics requests to the network.",
          fr: "Comptage des pages vues avec Vercel Web Analytics (sans cookies). Le service worker laisse les requêtes de statistiques au réseau.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.4.0",
  },
  {
    changes: {
      added: [{ en: "README, MIT license and contributing guide.", fr: "README, licence MIT et guide de contribution." }],
      fixed: [
        {
          en: "A selected button in the Ranges pickers turned unreadable (light text on a light background) on hover.",
          fr: "Un bouton sélectionné dans les choix de Ranges devenait illisible (texte clair sur fond clair) au survol.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.3.1",
  },
  {
    changes: {
      added: [
        {
          en: "French translation at `/fr`, with a 🇬🇧 EN / 🇫🇷 FR switch that keeps the current tool and setup. A phone set to French opens the French app.",
          fr: "Traduction française sur `/fr`, avec un bouton 🇬🇧 EN / 🇫🇷 FR qui garde l’outil et la configuration en cours. Un téléphone réglé en français ouvre l’app en français.",
        },
        {
          en: "French number formatting (`12 500`, `81,9 %`) and a French Glossary. A Glossary search finds terms by their English or French name.",
          fr: "Les nombres à la française (`12 500`, `81,9 %`) et un lexique en français. La recherche du lexique trouve les termes par leur nom anglais ou français.",
        },
      ],
      changed: [
        {
          en: "Solver and range errors are translated: the maths returns error codes and the UI writes the text.",
          fr: "Les erreurs du solveur et des ranges sont traduites : les calculs renvoient des codes et l’interface écrit le texte.",
        },
      ],
      fixed: [
        {
          en: "The language switch kept the setup only once the page had loaded; it now keeps it on the first tap.",
          fr: "Le choix de langue ne gardait la configuration qu’une fois la page chargée ; il la garde maintenant dès le premier geste.",
        },
        {
          en: "Typing in the Glossary filter removed the `#term` from the address.",
          fr: "Taper dans le filtre du lexique retirait le `#terme` de l’adresse.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.3.0",
  },
  {
    changes: {
      added: [
        {
          en: "A Blind level in the Solver's preflop line, so level 1 (50/50) pots use the real blinds.",
          fr: "Un niveau de blindes dans la ligne préflop du solveur, pour que les pots du niveau 1 (50/50) utilisent les vraies blindes.",
        },
        {
          en: "The Solver's place in the game tree and the selected hand class now live in the URL, as does the selected hand class in Ranges.",
          fr: "La position dans l’arbre du solveur et la main sélectionnée sont maintenant dans l’URL, comme la main sélectionnée dans Ranges.",
        },
      ],
      changed: [
        { en: '"Position" replaces "seat" everywhere.', fr: "« Position » remplace « siège » partout." },
        {
          en: "Button styles and number formatting are shared across tools. The progress bar no longer animates, and grid labels no longer use a text shadow.",
          fr: "Les styles de boutons et le format des nombres sont communs à tous les outils. La barre de progression n’est plus animée, et les libellés de la grille n’ont plus d’ombre.",
        },
      ],
      fixed: [{ en: "The Equity player-kind control was below the 44px touch target.", fr: "Le choix du type de joueur dans Équité était sous la taille tactile de 44 px." }],
    },
    date: "2026-11-15",
    version: "1.2.0",
  },
  {
    changes: {
      added: [
        {
          en: "Glossary: plain explanations of about 90 poker terms and abbreviations used in the app, grouped by topic, with a filter and a link per term.",
          fr: "Lexique : des explications simples d’environ 90 termes et abréviations de poker utilisés dans l’app, classés par thème, avec un filtre et un lien par terme.",
        },
      ],
    },
    date: "2026-11-15",
    version: "1.1.0",
  },
  {
    changes: {
      added: [
        {
          en: '**Advisor**: the Chart\'s answer for your exact hand, Position, stack and the action before you, with a verdict card and the size to use. Postflop: equity against estimated ranges, pot odds, required equity, SPR and a heuristic verdict, with "Open in Solver".',
          fr: "**Conseil** : la réponse de la chart pour ta main, ta position, ton stack et l’action avant toi, avec une carte verdict et la taille à jouer. Postflop : équité contre les ranges estimées, cote du pot, équité requise, SPR et un verdict indicatif, avec « Ouvrir dans le solveur ».",
        },
        {
          en: "**Equity**: 2 to 8 players, each a hand, a range or random, with board and dead cards. Exact enumeration when feasible, Monte Carlo otherwise, in a Web Worker.",
          fr: "**Équité** : de 2 à 8 joueurs, chacun une main, une range ou au hasard, avec board et cartes mortes. Calcul exact quand c’est possible, Monte-Carlo sinon, dans un Web Worker.",
        },
        {
          en: "**Ranges**: the preflop Charts by Situation, Position and Stack tier on a 13×13 grid, push/fold grids showing the largest stack each hand still pushes or calls, and a scratchpad that copies range strings.",
          fr: "**Ranges** : les charts préflop par situation, position et tranche de stack sur une grille 13×13, des grilles push/fold avec le plus gros stack où chaque main pushe ou calle encore, et un brouillon qui copie les ranges en texte.",
        },
        {
          en: "**Solver**: a discounted-CFR heads-up postflop solver for turn and river Spots, and small flop Spots. It fills both ranges from a preflop line and shows the strategy grid, the game tree, and combos, EV and equity per hand class.",
          fr: "**Solveur** : un solveur postflop heads-up (CFR actualisé) pour les spots turn et river, et les petits spots flop. Il remplit les deux ranges depuis une ligne préflop et montre la grille de stratégie, l’arbre de jeu, et combos, EV et équité par main.",
        },
        {
          en: "Seeded baseline Charts (Open, Vs open, Vs limpers) for three Stack tiers, validated at build time.",
          fr: "Des charts de départ (Open, Face à un open, Face aux limpers) pour trois tranches de stack, vérifiées à la compilation.",
        },
        {
          en: "Push/fold Charts from 1 to 15bb, generated by a deterministic chip-EV Nash script that matches published heads-up results.",
          fr: "Des charts push/fold de 1 à 15bb, générées par un script d’équilibre de Nash en chip-EV, reproductible, qui retrouve les résultats heads-up publiés.",
        },
        {
          en: "A fast 5–7 card hand evaluator and a range-string parser and formatter.",
          fr: "Un évaluateur de mains rapide de 5 à 7 cartes, et un lecteur et formateur de ranges en texte.",
        },
      ],
    },
    date: "2026-11-15",
    summary: {
      en: "First release: a mobile-first No-Limit Hold'em study tool that runs entirely in the browser, installs as an app and works offline.",
      fr: "Première version : un outil d’étude du No-Limit Hold’em pensé pour le téléphone, qui tourne entièrement dans le navigateur, s’installe comme une app et marche hors ligne.",
    },
    version: "1.0.0",
  },
];
