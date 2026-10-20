# Repository Guidelines

## Project Structure & Module Organization

Portal CBA manages basketball games, attendance, athlete statistics, finances, and administration. The frontend uses React 19 and Create React App.

- `src/`: components, feature dashboards, utilities, styles, and colocated tests. `App.js` manages authentication and navigation; `index.js` is the entry point.
- `src/cbaApi.js`: shared API client. Reuse `InitialDataContext.js` for data already loaded by the portal.
- `public/`: HTML shell, manifest, icons, and static assets.
- `scripts/`: Tailwind generation and backend regression checks.
- `supabase/functions/` and `supabase/migrations/`: backend functions and versioned SQL changes. The full deployed schema is not versioned here.

## Build, Test, and Development Commands

Use Node.js 24.x. The committed `.npmrc` enables `legacy-peer-deps`.

- `npm ci`: install dependencies from `package-lock.json`.
- `npm start`: generate Tailwind CSS and start the local development server.
- `npm run build`: generate styles and create the production bundle in `build/`.
- `npm test -- --watch=false --runInBand`: run frontend tests once.
- `npm run test:backend`: check backend authentication behavior.
- `npm run test:profile`: check profile ownership and permissions.
- `npm run test:photo`: check profile photo behavior.

## Coding Style & Naming Conventions

Follow the surrounding file's formatting: newer modules generally use two spaces; `App.js` uses four. Use semicolons, functional React components, and hooks. Name components in PascalCase (`HomeDashboard.js`) and utilities in camelCase (`agendaCalendar.js`). Keep Portuguese interface text consistent with existing screens.

ESLint uses the `react-app` and `react-app/jest` presets. Review hook dependency warnings. Edit `src/tailwind.source.css`; never edit or commit generated `src/tailwind.generated.css`.

## Testing Guidelines

Frontend tests use Jest and React Testing Library; name them `*.test.js` beside the corresponding module. Cover meaningful behavior, failure states, and regressions. Backend checks use Node assertions and mocked function environments. No numerical coverage threshold is configured. Run relevant tests and the production build before submitting functional changes.

## Commit & Pull Request Guidelines

History favors concise Portuguese subjects beginning with verbs such as `Adiciona`, `Corrige`, or `Melhora`, sometimes including a version or issue reference. Follow that pattern and keep commits focused.

PRs should explain the resulting behavior, reference related issues, list validation performed, and include screenshots for visual changes. Document required migrations or function deployments.

## Security & Configuration

Keep secrets in ignored local environment files. Never expose service keys in frontend code. Administrative permissions must be validated on the server; browser roles only control presentation. Use the shared API client for requests.
