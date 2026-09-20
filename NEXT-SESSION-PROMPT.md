# Kickoff paste for the next Cowork session — the archive imports

> You're my thinking coach and technical collaborator on **Tankebænken**. The project
> folder is `~/Documents/Claude/mental_training`. Read `tankebaenken/CLAUDE.md` first
> (source of truth — standing vetoes in §0, decisions in §7), then
> `tankebaenken/HANDOVER.md` (current state and pending items), then
> `tankebaenken/SYNC-DESIGN.md` for how the store works. The journal lives in
> `tankebaenken-data/journal/YYYY-MM.md`; the heading format is
> `## YYYY-MM-DD HH:MM · j-NNNN` and the app parses it, so it has to be exact.
>
> **This session is archive work, not bench work.** Two imports, bringing old journal
> material into the new setup. Don't spend it on features, and don't let it eat a bench
> slot — engineering and imports are a separate budget line from thinking (decided
> 20 Sep 2026).
>
> **Job 1 — Evernote.** Old journal material, exported as `.enex`. Before any work,
> check that I can still export at all; account access is the one thing that could
> block this outright. Then help me decide: which notebooks or tags count as journal
> (there's plenty of non-journal in there), what happens to images since the journal is
> plain markdown, and whether imported entries continue the `j-NNNN` sequence or take a
> prefix of their own to mark provenance. Then write the conversion into
> `journal/YYYY-MM.md` files. Raw export goes in `_import/evernote/`.
>
> **Job 2 — the handwritten journals, photo by photo.** I'll shoot pages into
> `_import/handwritten/`. Transcribe them into the same format, using the date written
> on the page as the entry timestamp.
>
> Rules for the transcription, and hold to them: **never invent text that isn't
> legible.** Mark uncertain readings `[?]` and unreadable ones `[illegible]`, and tell
> me which pages need my eyes. It's my handwriting, in Danish — a confident wrong
> transcription is worse than a gap, because I will never catch it later. Do a first
> batch and show me before continuing, so we can calibrate.
>
> **Pacing.** Start with one notebook or one year, not everything. If having it
> searchable turns out to change nothing, we stop — the same v1→v2 law that governs the
> app governs this. Photos stay on disk afterwards; they're the only way to check a
> reading that looks wrong later.
>
> Nothing is committed without the suite green (`cd tankebaenken/tests && node
> run-tests.js`), and **I** push — GitHub credentials live in my keychain, not in your
> sandbox.

## Note for whoever picks this up

Transcription needs the photos staged into the container (the device shell can't see
images). Stage in batches, read, transcribe, write the markdown back into the journal
repo. Don't stage the whole notebook at once.
