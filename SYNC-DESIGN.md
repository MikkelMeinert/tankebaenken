# SYNC-DESIGN.md — one store, both devices

Decided 20 Sep 2026, not yet built. This is the brief for the build session. When it
is built, fold the decisions into CLAUDE.md §6/§7 and keep the *why* here.

## The problem, from evidence

The 20 Sep export proved it: three captures (25 Aug boat, 26 Aug island, 5 Sep bed),
every one made in unstructured time, every one stranded in localStorage on the phone.
The Mac's copy of the app knows nothing about them, and the only route out was an
export button Mikkel couldn't find. CLAUDE.md §1's design target — "habit within
structured weeks" — is contradicted by his own data: capture happens away from the
desk. A journal that lives only on the Mac is therefore designed against actual usage.

Two requirements, stated 20 Sep: **one flow on phone and computer**, and **reachable
by Claude without a manual export**. Those two jointly force a single store somewhere
both devices and Claude can reach. That much is not a preference.

## Decision: a private repo as the store, not a database

- `tankebaenken` (public) stays exactly what it is — app code on GitHub Pages.
- `tankebaenken-data` (**private**, new) is the store:
  - `state.json` — whole app state (stones, quarry, books, readingLog, journal)
  - `journal/YYYY-MM.md` — generated markdown, one file per month
- Cloned at `~/Documents/Claude/mental_training/tankebaenken-data/`, so Claude reads
  everything by pulling and git history is a free audit log.

Rejected, with reasons:

- **Supabase/Firebase** — least work of the real backends, but adds a vendor to
  outlive, and free tiers pause on inactivity, which is precisely the usage pattern of
  a once-a-week tool.
- **VPS + Postgres** — a server to maintain forever, for 5 KB of data.
- **iCloud/Dropbox file sync** — fine for the journal, useless for app state, and it
  leaves two surfaces, which is the thing being eliminated.
- **Git on the phone (Working Copy)** — real sync, but committing from a phone at
  23:40 in bed is not two taps, and capture ergonomics are the one thing currently
  working.

Deciding argument: **a journal outlives every stack it is put into.** Plain text in
git is readable in thirty years with no stack at all.

## Two outlets, one store

His constraint, 20 Sep: **one outlet on the phone, one on the MacBook.** That settles
a question the first draft of this file got wrong. The phone's outlet is the app. The
Mac's outlet is a real text editor on the cloned repo. They write to different things
and never fight:

- `state.json` — stones, quarry, books, readingLog, counters, sync. **The app is the
  only writer.**
- `journal/YYYY-MM.md` — prose, **authoritative, never generated**. The app appends;
  the editor edits freely. Nothing regenerates the file, so nothing can clobber a
  hand-edit.

*Superseded:* the first draft made markdown a derived artifact re-rendered from
`state.json` on every sync. That would have overwritten desk writing and forced the
journal into a browser textarea — the exact adoption risk it flagged. Rejected on his
constraint, and the append-only design is simpler anyway.

## Data model

`state.json` keeps its current shape (version, counters, stable ids) and adds only:

    counters.journal
    sync: { lastPushAt, lastPullAt, pending:bool }

Journal prose does **not** live in `state.json`. Each entry is a section in the
month's markdown file, carrying a stable id in its heading so other things can point
at it:

    ## 2026-09-20 21:14 · j-0007

    Text of the entry, however long or short.

The app only ever **appends** — it never edits or reorders existing entries. Editing
the past is the editor's job on the Mac. Append-only makes merges trivial and loss
close to impossible.

For offline reading on the phone, the app caches the last pulled month in
localStorage. Writing never waits for the network.

## No tags

Dropped on his objection, correctly: typing `#sten` mid-prose is a syntax tax, and
structure imposed at writing time is structure that doesn't get imposed. The path back
to use is a **button** — a journal entry gets "→ quarry", creating a quarry item and
storing `fromJournal: "j-0007"` on the quarry item, so it points back at the entry it
came from — the same parent-link spare stones already have.

## Sync mechanics

Non-negotiable: **the local write always succeeds first.** Capture on a boat with no
signal must never fail, and a sync failure must never block or lose an entry.

- Write: localStorage immediately → mark `pending` → push when online.
- Push: GET the file for its blob SHA → merge → PUT with that SHA. If the PUT is
  rejected as stale, re-fetch and retry once, then stay `pending`.
- Pull: on app open. Merge per entity by `id`, last-write-wins on `updatedAt`.
  Entities are append-mostly, so real conflicts are rare — and git history makes any
  bad merge recoverable, which a database row is not.
- Visible state: a small "unsynced" chip. Never a modal, never a blocking error.

## Auth, honestly

A GitHub **fine-grained personal access token**, scoped to `tankebaenken-data` only,
permission `Contents: read and write`, with an expiry. Entered once per device in the
app's settings, stored in that device's localStorage.

Plainly: anyone with access to that browser profile can read the token and therefore
the private repo, which contains the journal. Mitigations are scope (one repo),
expiry, and one-click revocation. Judged acceptable for a personal journal; would not
be for anything else. The alternative — a serverless proxy holding the token — means a
service to maintain; rejected for v1, revisit if the token placement starts to feel
wrong.

**The token is never committed and never enters `index.html`.** It is runtime input,
and the backup/export JSON must exclude it. That gets a test.

## The walkthrough (his steps, in order)

1. On github.com: **New repository** → `tankebaenken-data` → **Private** → no README.
2. **Account** settings, not the repo's — github.com/settings/personal-access-tokens
   (avatar, top right → Settings → bottom of the left sidebar → Developer settings →
   Personal access tokens → **Fine-grained tokens**) → Generate new token.
   Resource owner: MikkelMeinert. Repository access: **Only select repositories** →
   `tankebaenken-data`. Permissions → Repository permissions → **Contents: Read and
   write** (Metadata: Read-only is added automatically — that is expected). Set an
   expiry. Copy the token — GitHub shows it exactly once.
3. From `~/Documents/Claude/mental_training/`:
   `git clone https://github.com/MikkelMeinert/tankebaenken-data.git`
   then move the existing `journal/` contents into it.
4. Deploy the app (APP_VERSION + sw CACHE bumped, suite green), open it on the Mac,
   paste the token in Settings, Sync. Verify `state.json` appears on GitHub.
5. Open the app on the phone, paste the token, Sync. Verify q-0006, q-0007 and q-0008
   arrive on the Mac.
6. Claude pulls the clone and confirms it reads the same state.

Step 5 is the one that matters: the first moment the phone's captures exist anywhere
else.

## Tests the build must add

- merge by entity id, last-write-wins on `updatedAt`
- stale-SHA PUT → one retry → then `pending`, with no data loss
- an offline write survives a reload and still pushes afterwards
- appending an entry preserves every existing byte of the month file
- a journal id in a heading round-trips (write, pull, append again, still intact)
- **the token never appears in the export JSON**
- promoting a journal entry creates exactly one quarry item and links it

All green or no deploy. Once real data exists, run the suite against a pulled
`state.json`, not the seed.
