/**
 * Route-level loading state for the [locale] segment. Simple pulse skeleton — the
 * full loading/skeleton primitives land with the UI Kit (Stage 0.8).
 *
 * Fills the viewport under the site header (70px, 88px from `lg` — `Header.tsx`), so the footer
 * stays below the fold while a page loads. It used to be `min-h-[60vh]`, which left the footer
 * filling the bottom third of a phone between onboarding steps (Release 4 П9, 06.11.2026).
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
