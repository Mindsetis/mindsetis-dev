---
name: todo-jobs
description: >-
  Track development progress in ROADMAP.md — mark a stage/item as in progress when the user
  takes it into development, and as done when finished. Use when the user says "take stage
  1.1 into development", "start stage 2", "візьми в розробку етап X", "mark it done",
  "what's the status", or otherwise references roadmap stages/progress.
---

# Skill: todo-jobs

Maintain `ROADMAP.md` at the repo root as the single source of development progress. Follow
its status legend exactly.

## Status conventions (from ROADMAP.md)

- Stage `**Status:**` → `⬜ Not started` | `🔄 In progress` | `✅ Done`
- Items: `- [ ]` todo · `- [~]` in progress · `- [x]` done

## When the user takes a stage/item into development

Trigger phrases: "take stage X into development", "start stage X", "візьми в розробку етап X".

1. Read `ROADMAP.md` and locate the stage/item.
2. Set the stage `**Status:** 🔄 In progress` and add/update `**Started:** <today's date>`.
   (Today's date is provided in the session context — use it; do not guess.)
3. Set the specific item(s) being worked on to `- [~]`.
4. Confirm to the user what is now in progress, then begin the actual work (delegate to the
   right subagent/skill: `supabase-expert`, `nextjs-frontend`, `stripe-payments`,
   `new-migration`, `scaffold-feature`, etc.).

## When work on an item/stage finishes

Trigger phrases: "mark it done", "done", "готово", "заверши етап X".

1. Set completed item(s) to `- [x]`.
2. If **all** items in the stage are `- [x]`, set the stage `**Status:** ✅ Done` and add
   `**Completed:** <today's date>`. Otherwise leave the stage `🔄 In progress`.
3. Never delete completed items — they remain checked as a record.
4. Report the updated stage status and what remains.

## Status query

Trigger phrases: "what's the status", "what's left", "статус". Summarize per-stage status
and list in-progress (`- [~]`) items without editing the file.

## Rules

- Only edit `ROADMAP.md` for status changes; keep item text intact.
- Keep one stage as the active focus unless the user explicitly parallelizes.
- If a requested stage doesn't exist in `ROADMAP.md`, ask the user before adding it.
