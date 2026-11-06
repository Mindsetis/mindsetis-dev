/**
 * Route-level loading state for the [locale] segment. Simple pulse skeleton — the
 * full loading/skeleton primitives land with the UI Kit (Stage 0.8).
 *
 * Duplicated (not shared) from `app/[locale]/(app)/loading.tsx`: the homepage
 * (`app/[locale]/page.tsx`) sits outside the `(app)` route group, and Next.js doesn't
 * support sharing a single loading boundary across sibling route-group + non-group
 * segments — each segment needs its own file.
 *
 * Same full-height box as that file (Release 4 П9) — see its doc comment.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[calc(100dvh-70px)] items-center justify-center lg:min-h-[calc(100dvh-88px)]">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent"
      />
    </div>
  );
}
