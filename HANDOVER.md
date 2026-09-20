# HANDOVER — Tankebænken

State as of **20 September 2026** (second Cowork session: adoption review → stack
rebuild → partial bench → canon updated). Read `CLAUDE.md` first — it is the source of
truth; this file is only the moving state.

## What the first month actually showed

Read honestly from his backup, not from hope: **0 bench sessions**, **1 reading session**
(25 min Goffman, 5 Sep), **3 captures** — 25 Aug on a boat in South Fyn, 26 Aug on an
island, 5 Sep in bed — then fifteen quiet days. He is mid-transition (new flat, new
rhythm), exactly the failure mode §1 predicts.

The finding that mattered more than the counts: **every capture was made in unstructured
time.** None at the desk, none inside a structured week. That contradicts §1's design
target and is why the journal could not be a Mac-only folder. It also explains why both
of his asks this session were *capture* surfaces — he was reaching for what fits his
current capacity, and the right response was to make that explicit rather than let it
drift. Hence the re-entry decision in §7: bench dormant by design, journal and reading
carrying the practice.

## Built and shipped this session

**v1.1.1, live, 115/115 assertions green** (was 59).

- **Journal tab** — append-only prose, stable ids (`j-0001`) carried in the markdown
  heading, "→ quarry" button in place of tag syntax.
- **Sync** — private repo `tankebaenken-data` as the store. `state.json` merged per
  entity id; `journal/YYYY-MM.md` appended to, never regenerated. Token in its own
  localStorage key, outside `S`. Brief: `SYNC-DESIGN.md`.
- **v1.1.1 hotfix** — the service worker was caching cross-origin GETs, so a 401 from a
  bad token was replayed forever. Now same-origin only, and never caches a non-ok
  response. The regression test was verified to fail against the old file.
- **Verified end to end**: q-0006, q-0007 and q-0008 travelled phone → repo → Mac.

Both devices hold their own token. A `git pull` is currently needed before Claude can
read the repo — see the open item below.

## The bench, session 2 (partial, by design)

Stone **q-0007** (similarity asymmetry) — parked **open**, card filed. Strip produced a
bare claim and a tested scope widening; then the form was dropped mid-session under the
anti-death clause when Strip started optimising the claim for breakability. The
exploratory mode that replaced it produced the actual yield: four candidate carriers of
the ordering (lexicon, sentence structure, shared world-knowledge, speaking situation)
and one case where two conflict and speaker-position wins. Five spare stones.

Open thread, genuinely fertile: **which anchor wins when they compete.**

## Pending

1. **Karamazov companion** — commissioned, not yet written. Pevear & Volokhonsky, 796pp,
   on his shelf since 2024. Build it around the five Very Bad Wizards episodes as
   stretch boundaries; prepare-the-eye format, no per-chapter watch-fors.
2. **Read-only token** for the data repo, gitignored beside the clone, so Claude can
   fetch without him running `git pull` each session. Smaller blast radius than the
   app's read+write token.
3. **Return still queued**: the voice stone, next talk with the friend. Now joined by
   q-0007's return — his brother, the inversion test spoken out loud.
4. **8-week review (~mid-Oct)** — rewrite the success test before then. "≥3 bench
   sessions" was written before the re-entry decision and measures the wrong thing now.

## Next session

Karamazov companion first (it is owed), then either the open thread on q-0007 or a fresh
stone from the quarry. Do not spend the bench slot on the app: engineering is a separate
budget line, decided 20 Sep. Growth only on demonstrated use — the v1→v2 law holds.

Before any deploy: `cd tests && npm install && node run-tests.js`, and bump
`APP_VERSION` + sw `CACHE` together. Pushing needs his Mac (credentials live in his
keychain, not in Claude's sandbox); Claude commits, he pushes.
