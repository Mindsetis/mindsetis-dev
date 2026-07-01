/**
 * Route-level loading state for the [locale] segment. Simple pulse skeleton — the
 * full loading/skeleton primitives land with the UI Kit (Stage 0.8).
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent"
      />
    </div>
  );
}
