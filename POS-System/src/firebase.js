// DEPRECATED / UNUSED.
//
// This project uses Database (see src/db.js) for auth, database and
// realtime. Firebase was never actually imported anywhere in the app, so the
// `firebase` npm package has been removed from package.json to shrink the
// bundle (~500KB+ saved) and stop the unused Analytics network call.
//
// This file is intentionally left empty. If you ever need Firebase again,
// re-add the dependency (`npm i firebase`) and restore the config from git
// history. Do NOT import from this file — it exports nothing.

export {};
