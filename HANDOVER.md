# HANDOVER — Tankebænken

State as of **19 August 2026** (kickoff session: interview → live bench session #1 →
brief signed off → v1 built and tested). Read `CLAUDE.md` first — it is the source of
truth; this file is only the moving state.

## Where things stand

**Built and green (59/59 jsdom tests):** `index.html` (single-file PWA: Shelf /
Quarry / Reading + settings, kickoff builder, STONE CARD v1 parser, backup
export/import), `sw.js` (network-first HTML, cache-first assets, CACHE
`tankebaenken-1.0.0`), manifest + icons, test suite in `tests/`.

**Seeded content (real, from the live session):** stone `st-0001` (the voice stone,
verdict: split), 5 linked spare stones, Goffman + Austin on the book shelf, Return
queued ("next talk with the friend"). The app opens non-empty on day one by design.

## Pending — Mikkel's checklist

1. Create GitHub repo `tankebaenken` (public, no README) under MikkelMeinert; push
   these files; enable Pages (main / root). Exact commands in `README.md`. Known
   flake: first Pages deploy can fail generically → empty commit, wait, retry.
2. Install on phone + PC from the Pages URL (`SETUP-PHONE.md`).
3. Create the **"Sparring Partner"** Claude Project (phone+desktop) with
   `PROJECT-INSTRUCTIONS.md` as instructions.
4. ~~Pick season 1~~ **Done (19 Aug): Performance & social roles, open-ended.**
   Library catalogued from Goodreads export (376 tracked / 201 physical) →
   `library/LIBRARY.md` (gitignored — contains private data; never push `library/`).
   Remaining: register in the app — Goffman as *reading*; Metcalf (Presidential
   Voices) + Dolar (Rumors) as *shelf*. Nothing else — the wall is the library, the
   app is the workbench.
5. First real-world Return is already queued: the voice stone, next talk with the
   friend.

## Next Cowork session (~monthly, or on demand)

Agenda: import his backup JSON → check adoption honestly against §5 of CLAUDE.md
(sessions happened? stones shelved? returns closed? reading logged?) → fix frictions
he reports → only then consider features. The 8-week review (~mid-October) decides:
does the week strip survive (guilt check)? does meditation enter? does solo-bench mode
need investment? **Growth only on demonstrated use — the v1→v2 law.**

Before ANY handover/deploy: `cd tests && npm install && node run-tests.js`, and bump
`APP_VERSION` + sw `CACHE` together (the suite enforces the match). Once real data
exists, test against an imported backup, not just the seed.

## Open questions parked on purpose

Re-entry after life transitions (deferred by decision) · readiness-tap analog (no
gating decision identified — skip) · prediction log (demoted; only revive on his
explicit ask) · extending the voice stone's claim to written communication (spare
stone, his call).
