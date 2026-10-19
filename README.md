# Cornhole Tournaments

Personal cornhole tournament tracker for completed games, career performance, and tournament history.

## Stack
React 19, TypeScript, Vite, Recharts, IndexedDB (via idb), GitHub Pages.

## Local development
```bash
npm install
npm run dev
npm run build
```

## Deployment
The GitHub Actions workflow builds and deploys on pushes to `main`. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source. Expected project URL: https://rzyin1.github.io/Cornhole-Tournaments/ (available only after a successful Pages deployment).

## Data and privacy
Tournament records are stored in your browser's IndexedDB, **not** in this public repository. No login or device sync. Use **Settings → Export JSON Backup** regularly and before clearing browser data or switching devices. Restoring a backup replaces local records after confirmation.

## Current implementation
- Responsive five-section navigation and dark-green dashboard
- Tournament creation, stages, placements, notes, Draft/Complete status
- Completed-game entry, ScoreMagic round requirement with results-only override
- Quick round entry and full round table, score calculations, official score overrides
- Saved bag list, player name history, statistics and charts
- Tournament cards and table, filterable career stats, initial side-by-side format comparison
- JSON backup/restore and recycle bin

## Further development / validation
This is an initial implementation, not a fully verified release. Before relying on it for a full tournament season, test build and data workflows. Remaining refinements include robust record validation, full independent nine-filter comparison groups, all planned chart categories, stage/game reordering controls, sortable game tables, and comprehensive automated scoring tests.
