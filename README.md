# LeaveLens

LeaveLens turns a natural-language leave/holiday query into the best possible vacation window — combining public holidays, weekends, and however many leave days you're willing to spend.

Type something like *"I have 2 leaves in India 2026"* and it finds the break that gives you the most consecutive days off for the least leave spent, plus a few alternatives to compare.

## Features

- **Natural-language query parsing** — understands leave budgets, target trip lengths, months, years, and "long weekend" style requests without any special syntax.
- **Real public holiday data** — fetched live from [Nager.Date](https://date.nager.at/), with a Tallyfy API fallback and a small bundled emergency dataset so the app still works if both are unreachable.
- **Smart optimization** — searches every possible 3–14 day window and ranks them by total days off and leave-day efficiency.
- **Interactive UI** — a day-by-day timeline (work / weekend / holiday / leave), a leave-budget slider, alternative options to compare, and one-click `.ics` calendar export.
- **13+ countries supported** out of the box (India, US, UK, Japan, Canada, Australia, Germany, France, Singapore, Brazil, Italy, Spain, Mexico, Netherlands, Switzerland) — easy to extend.

## Example queries

- `I have 2 leaves in India 2026`
- `Best long weekends in India 2026`
- `Find 4 day breaks in India 2026`
- `Best vacation with 1 leave in Japan 2026`
- `How many days off can I get with 3 leaves?`

## Tech stack

- React 18 + Vite
- MUI (Material UI) 6
- Plain JavaScript (ES modules), no TypeScript
- No AI/ML — deterministic query parsing (regex) and a brute-force date-window search algorithm
- Zero backend — talks directly to public holiday APIs from the browser

## Getting started

```bash
npm install
npm run dev      # start local dev server
npm test         # run the test suite
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

## Project structure

```
src/
├── main.jsx                     — app entry point
├── App.jsx / App.css            — search bar + page shell
└── frontend/
    ├── LeaveLens.jsx             — main result UI (timeline, slider, alternatives, .ics export)
    ├── leaveLens.css
    └── lib/
        ├── hyperdart/            — query text → structured intent
        │   ├── searchDataAdapter.js  (country resolution)
        │   └── queryParser.js       (intent, year, month, leave budget, duration)
        ├── holidays/
        │   ├── holidayService.js     (Nager.Date → Tallyfy → bundled fallback)
        │   └── holidayNormalizer.js
        ├── vacation/
        │   ├── vacationEngine.js     (core optimizer + .ics builder)
        │   └── vacationExplanations.js
        └── dates/
            └── dateUtils.js
tests/
└── leaveLensCore.test.mjs        — unit tests for the parsing/optimization logic
```

> Note: the `hyperdart` folder name is a holdover from this project's origins as a component for the HyperDart search platform. It's just a module namespace here — there is no dependency on HyperDart in this standalone version.

## Product assumptions

- Monday–Friday workweek, Saturday/Sunday are weekends.
- Public/national holidays count as non-leave days off.
- Leave budget maxes out at 5 days; search window maxes out at 14 days.

## License

MIT
