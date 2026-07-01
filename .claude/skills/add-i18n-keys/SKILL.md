---
name: add-i18n-keys
description: >-
  Add or sync next-intl translation keys for Mindsetis, English-first, keeping messages/en.json
  (source) and messages/es.json (readiness) structurally in sync and sorted. Use when adding
  user-facing copy, when the user says "add translations", "add i18n keys", or after creating
  any component/page with new strings.
---

# Skill: add-i18n-keys

All user-facing UI text and emails go through next-intl dictionaries. English is the source
of truth; Spanish is kept structurally ready.

## Rules

- **English-first:** add the real copy to `messages/en.json`. For `messages/es.json`, mirror
  the same key structure; if no translation is provided yet, copy the English value (or mark
  `TODO`) so the two files stay structurally identical.
- **Namespacing:** group keys by feature/component (e.g. `booking.title`, `catalog.filters.topic`).
  Use `useTranslations("<namespace>")` in components.
- **No hardcoded strings** in components — every visible string is a key.
- **Profile content is exempt** — user-authored profile content is stored in the author's
  `content_locale`, not in dictionaries.
- Keep keys **sorted** within their namespace and keep both files in the **same order**.

## Steps

1. Read `messages/en.json` (and `es.json`) to find the right namespace or create one.
2. Add the key(s) with English values to `en.json`.
3. Mirror the identical keys in `es.json` (English fallback or translation).
4. Verify both files are valid JSON and structurally identical (same keys, same order).
5. Reference the keys in the component via next-intl (`useTranslations` / `getTranslations`).

## Verify

```bash
# both files must be valid JSON
node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))" \
  && node -e "JSON.parse(require('fs').readFileSync('messages/es.json'))"
```
Confirm no key exists in one file but not the other.
