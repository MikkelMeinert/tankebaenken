# Tankebænken

Mental-training bench: **Strip · Dig · Break · Follow · Place**, a quarry for ideas,
and reading that earns its place. Single-file PWA, no dependencies, all data in
localStorage on your device. Docs: `CLAUDE.md` (source of truth), `HANDOVER.md`
(state), `PROJECT-INSTRUCTIONS.md` (Claude Project), `SETUP-PHONE.md` (install).

## First deploy (one-time)

Create an empty **public** repo named `tankebaenken` on github.com (no README), then
from this folder:

```bash
cd ~/Documents/Claude/mental_training/tankebaenken
git init -b main
git add .
git commit -m "Tankebænken v1.0.0 — bench, quarry, reading, seeded with the voice stone"
git remote add origin https://github.com/MikkelMeinert/tankebaenken.git
git push -u origin main
```

Then on GitHub: repo → Settings → Pages → Source: **Deploy from a branch** →
Branch: **main**, folder **/ (root)** → Save. App appears at
`https://mikkelmeinert.github.io/tankebaenken/` after a minute or two.

Known flake (seen on the fitness app): the first-ever Pages deploy can fail with a
generic error. Fix: `git commit --allow-empty -m "kick pages" && git push`, wait,
retry.

**The URL is permanent — logs are keyed to it. Never rename the repo.**

## Every later deploy

1. Bump `APP_VERSION` in `index.html` **and** `CACHE` in `sw.js` (must match — the
   test suite fails otherwise).
2. Run the tests (below). All green or no deploy.
3. `git add . && git commit -m "..." && git push`. Phone picks it up on next open
   (network-first HTML); logs untouched.

## Tests

```bash
cd tests
npm install   # first time only
node run-tests.js
```

59 assertions: seed integrity, stable ids, no-reseed on reload, STONE CARD v1
round-trip, quarry/reading/return mutations, backup round-trip, malformed-import
rejection, version-match, stale-content checks. Run before every handover.
