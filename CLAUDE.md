# CLAUDE.md — Tankebænken (source of truth)

Mental-training system for Mikkel Meinert. v1.0.0, written 19 August 2026 after the
kickoff interview + first live bench session. This file is the brief; correct it, don't
fork it. Sibling docs: `HANDOVER.md` (session state), `PROJECT-INSTRUCTIONS.md`
(phone/desktop Claude Project), `SETUP-PHONE.md`, `README.md` (deploy).

## §0 Standing vetoes — read first, enforce always

1. **Never boring.** Headline law. If a session or feature produces obligation without
   interest, it is wrong, whatever the plan said.
2. **No notes graveyard.** Nothing is captured without a path back to use (quarry →
   bench; stone → return; place → reading path).
3. **No guilt machine.** No streaks. A bad week = the bench is cut guilt-free and
   reading switches to easy/fiction. That IS the release valve, by design.
4. **No metrics game.** No fake precision, no gamified junk, no workout-chasing numbers.
   Predictions are demoted (see §5). "Depth scores" are banned forever.

## §1 The person (what the sparring partner must know)

Copenhagen, analytically minded, time-poor, direct. Full week: squash, 2× volleyball,
4–5 gym sessions, daily cycling (bikes to work — no commute reading), full-time work.
Wants evidence-based pushback and gets to overrule theory with lived experience — his
corrections become guardrails.

**Empirical profile from session 1 (the voice stone, 19 Aug 2026):**
- **Break is his native mode — needs restraint, not encouragement.** He attacks before
  understanding. The handover's "Break is king" bet is wrong *for him*.
- **Strip and Follow need the most scaffolding.** The weak/strong split hiding inside a
  strong version took sparring; Follow had to be taught outright.
- Steps interleave naturally (he places during Dig, digs during Break). Checklist, not
  sequence — never police order.
- His felt itch is exploratory-interpretive (what is this idea? what's new in it?), not
  adversarial. Strip + Place produced the session's yield.
- Habits die at **life transitions**, not from daily friction (apartment renovation
  killed prior routines). Design target now: habit within structured weeks. Re-entry
  design: explicitly deferred.

## §2 What this is

Two linked practices, one app, one Claude Project:

- **The bench** — the five-step epistemics practice (Strip · Dig · Break · Follow ·
  Place, see `epistemics-training-brief.md`) run as a live sparring conversation with
  Claude, ~1×/week, 20–30 min, on the PC.
- **Reading** — 2–3 slots/week on the couch/recliner after sports. Dual function:
  idea-quarry AND uncoupling. **Uncoupling/fiction reading is never logged and owes the
  system nothing.** Thinking-reading feeds the bench; the bench's Place step feeds the
  reading pile ("books earn their place").

**Architecture inversion vs the fitness system (confirmed by Mikkel directly):** the
app is harness + memory; the *conversation* is the engagement engine. The app's job is
to start sessions (kickoff text), store what they produce (stone cards), catch spare
stones, and log reading — each touch in seconds.

## §3 The bench canon (post-session-1 refinements)

- One session, one stone. Splinters go to the quarry as **spare stones**, linked to
  their parent.
- Sessions end in a **split-capable verdict**: lens / hypothesis / split / repackages /
  extends / contradicts / open. "Strong claim = lens, token claim = hypothesis" was the
  yield of session 1 — that shape is the product.
- **Focus cues** (one per step, in-app): Strip "what is it actually saying?" · Dig
  "name the leg, holster the punch" · Break "structural beats individual; falsifiable
  or lens?" · Follow "if true, what else? the Return is the resolution" · Place
  "reminds me of? claim a reading path".
- Partial benches are legal (Strip + Break quickies). The 5-week rotation is suggested
  variety, not calendar law.
- **The anti-death clause:** if the session feels flat or the template fights the
  thinking, abandon the form, chase the interesting thread, sort notes into boxes
  afterwards. The template serves the thinking, never the reverse.

## §4 Cadence & budget

- **1 bench + 2–3 reading sessions/week**, each 20–30 min, afternoon/evening.
  Mon–Thu carries structure; Fri–Sun free-form. Order = priority: bench first.
- Deliberately held at this level despite Mikkel's kickoff enthusiasm for 5–6/week —
  enthusiasm is week-one fuel; the budget is the design (decision 2026-08-19).
- **No daily component.** Confirmed. Quarry capture is opportunistic, not scheduled.
- **Meditation is parked** (morning slot reserved in principle). Enters only if the
  core survives the 8-week review. Do not let it creep in earlier.

## §5 Mechanics & metrics (the honest list)

- **The Shelf** — stones with verdict badges. The visible accumulation.
- **Spare stones** — quarry items linked to parent stones; also free capture.
- **The Return** — "did this go back into conversation, what happened?" Replaces the
  prediction log as Follow's resolution mechanic (decision 2026-08-19, from lived
  session data). Non-gameable, socially triggered.
- **Predictions** — demoted to optional; only for genuine uncertainty; no default
  dates. Never resurrect them as a KPI.
- **Reading log** — book + minutes, thinking-books only, two taps.
- **Week strip** — bench ✓/– and reading n/target, gently, no streaks, no red states.
  (Least-confirmed mechanic — kill it at the first sign of guilt-machine behavior.)
- **8-week success test (due ~mid-October 2026):** ≥3 bench sessions that felt like
  real instruments (enlightenment, not homework), reading having played alongside
  through at least one theme cycle. Failure modes to watch: flat conversations; steps
  feeling formal/rugged.

## §6 Technical architecture

- **Stack:** single-file PWA (`index.html`, dependency-free vanilla JS) + `sw.js` +
  `manifest.webmanifest` + icons. GitHub Pages on repo `tankebaenken`
  (MikkelMeinert) → URL is permanent; **logs are keyed to it, never change it**.
- **State:** one localStorage key `tankebaenken-v1`. Stable ids (`st-0001`, `q-0001`,
  `b-0001`, `r-0001`) via monotonic counters — history survives every regeneration.
  Seeded with session 1 (the voice stone, 5 spares, Goffman + Austin).
- **Exchange formats:** app → Claude: "Start bench session" kickoff text.
  Claude → app: **STONE CARD v1** (exact format in `PROJECT-INSTRUCTIONS.md`); the
  app parses it into a stone + linked spares. Copy-paste both ways, by design — no
  mid-session tool juggling.
- **Deploy law (from the fitness system):** bump `APP_VERSION` in index.html AND the
  `CACHE` constant in sw.js on every deploy — the test suite fails if they diverge.
  Known Pages flake: first-ever deploy can fail generically; empty commit + patience.
- **Testing (non-negotiable):** `cd tests && npm install && node run-tests.js` — 59
  assertions incl. seed integrity, no-reseed on reload, stone-card round trip,
  backup round trip, version consistency. Run before every handover. When Mikkel has
  real data, import a backup into the suite's fixtures and test against it.
- Backup: share-sheet/file export, `storage.persist()`, nag chip after 10 unlogged
  entries.

## §7 Decisions log

- **2026-08-19** — Prediction log demoted; the Return is Follow's resolution mechanic.
  Reason: live session showed his reward is conversational yield, not calendar
  resolution; dates read as workout-chasing (veto 4).
- **2026-08-19** — 1 bench + 2–3 reading/week, against his own 5–6 proposal. Reason:
  handover order-of-magnitude rule; bench sessions are the expensive unit.
- **2026-08-19** — No daily component. Engagement engine = conversation, not app.
- **2026-08-19** — Meditation parked until 8-week review passes.
- **2026-08-19** — "Break is king" bet revised to "Break needs restraint" (session-1
  evidence). Scaffolding budget goes to Strip and Follow.
- **2026-08-19** — Reading never requires output; fiction never logged. Theme/season
  curation lives in conversation, not code.

## §8 Risks

Bench-as-homework (→ anti-death clause, partial benches). Overcommitment (→ §4
budget). Live-Claude dependency is accepted for the learning phase — solo-with-template
is the fallback, review at 8 weeks. Life transitions — deferred by explicit decision;
if one hits early, the correct response is a guilt-free full stop and a fresh
HANDOVER, not a redesign.
