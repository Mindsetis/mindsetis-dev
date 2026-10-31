/**
 * Helpers for the part of form validation React Hook Form leaves to the caller: finding the error
 * a submit was refused for, and putting it in front of the person who tapped "Save".
 *
 * Why this exists. A refused submit is only useful if the reason is VISIBLE, and three things kept
 * hiding it (Release 2, "Правки 3.0"):
 *   1. `@hookform/resolvers` stores an ARRAY-level issue (`path: ['superpowers']`) at
 *      `errors.superpowers.root`, not `.message`, whenever the array's items are registered fields
 *      (`superpowers.0.title` …). Code that read `errors.superpowers?.message` got `undefined`.
 *   2. Custom controls (`useController`) that show only `fieldState.error.message` miss every
 *      NESTED issue under their name (`weeklyAvailability.mon.0.to`).
 *   3. On a long form the message can be off-screen — or inside a card that collapsed — at the
 *      moment the pinned "Save" bar is pressed, which reads as the button doing nothing.
 */

/** Anything the error-marking components render: `FormItem` (`data-invalid`), `Combobox`/
 * `LanguagesMultiSelect` triggers (`data-invalid`), form controls (`aria-invalid`) and every
 * `FormMessage` / `FormArrayMessage` / hand-rolled message (`data-slot="form-message"`). */
export const FIELD_ERROR_SELECTOR =
  '[data-invalid], [aria-invalid="true"], [data-slot="form-message"]';

const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([aria-hidden="true"]), textarea, select, button:not([disabled])';

type ErrorNode = { message?: unknown; root?: unknown; [key: string]: unknown };

/**
 * The message of an array- or object-level error, wherever RHF put it: `root.message` (resolver
 * issue on an array whose items are registered fields) or plain `message` (a `setError` on the
 * name, or a resolver issue on an array nothing underneath is registered for). Item-level errors
 * (`errors.roles[0].title`) are deliberately NOT returned — those belong to the item's own field.
 */
export function arrayErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const { root, message } = error as ErrorNode;
  const rootMessage = root && typeof root === 'object' ? (root as ErrorNode).message : undefined;
  if (typeof rootMessage === 'string' && rootMessage) return rootMessage;
  return typeof message === 'string' && message ? message : undefined;
}

/**
 * The first message found ANYWHERE in an error tree — for a custom control that has no per-item
 * UI of its own (a chip list, a schedule) and so must surface whatever its subtree reports.
 * `ref` (a DOM node) and `types` are never walked.
 */
export function firstErrorMessage(error: unknown, depth = 0): string | undefined {
  if (!error || typeof error !== 'object' || depth > 6) return undefined;
  const own = arrayErrorMessage(error);
  if (own) return own;
  for (const [key, value] of Object.entries(error)) {
    if (key === 'ref' || key === 'types' || key === 'root' || key === 'message') continue;
    const found = firstErrorMessage(value, depth + 1);
    if (found) return found;
  }
  return undefined;
}

/** Where to look for the error: the form/container itself, or the submit event that started it
 * (`handleSubmit` hands it to both callbacks) — its target is the `<form>`. */
export type RevealSource = Element | { target?: EventTarget | null } | null | undefined;

function resolveScope(from: RevealSource): ParentNode {
  if (from instanceof Element) return from;
  const target = from?.target;
  if (target instanceof Element) return target.closest('form') ?? document;
  return document;
}

/** Clearance kept from the sticky site header (70/88px) and from the viewport's bottom edge. */
const SAFE_EDGE_PX = 96;

/**
 * How much of the viewport bottom a PINNED action bar (`StickyActionBar`, marked
 * `data-sticky-action-bar`) covers right now — a bar sitting at its natural place in the flow
 * covers nothing. The wizard's bar grows to two rows on a phone, so a fixed guess isn't enough.
 */
function pinnedBarHeight(): number {
  let covered = 0;
  for (const bar of document.querySelectorAll<HTMLElement>('[data-sticky-action-bar]')) {
    const { top, bottom } = bar.getBoundingClientRect();
    if (Math.abs(bottom - window.innerHeight) <= 2) covered = Math.max(covered, bottom - top);
  }
  return covered;
}

/**
 * Scrolls the page just enough to put the band `top..bottom` (viewport coordinates) inside the
 * area that neither the header nor a pinned bar covers: centered when it fits, top-aligned when
 * it is taller than that area. No-op when it is already there.
 */
function revealBand(top: number, bottom: number): void {
  const safeTop = SAFE_EDGE_PX;
  const safeBottom = window.innerHeight - Math.max(SAFE_EDGE_PX, pinnedBarHeight() + 16);
  if (top >= safeTop && bottom <= safeBottom) return;

  const room = safeBottom - safeTop;
  const height = bottom - top;
  const targetTop = height < room ? safeTop + (room - height) / 2 : safeTop;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollBy({ top: top - targetTop, behavior: reduceMotion ? 'auto' : 'smooth' });
}

export function scrollIntoViewIfNeeded(el: HTMLElement): void {
  const { top, bottom } = el.getBoundingClientRect();
  revealBand(top, bottom);
}

/**
 * The element to bring into view for the first error under `scope`. The first match is often a
 * wrapper — a `FormItem` around a whole weekly schedule, a list of cards — and centering a tall
 * wrapper can leave the actual faulty row under the pinned bar, so descend to the innermost
 * marked element: the invalid control (or its message) itself.
 */
function innermostError(scope: ParentNode): HTMLElement | null {
  let current = scope.querySelector<HTMLElement>(FIELD_ERROR_SELECTOR);
  while (current) {
    const inner = current.querySelector<HTMLElement>(FIELD_ERROR_SELECTOR);
    if (!inner) break;
    current = inner;
  }
  return current;
}

/**
 * Brings the FIRST visible field error of a form into view and focuses its control.
 *
 * React Hook Form can focus the first invalid field on its own, but only when that field handed it
 * a focusable `ref` — it silently skips custom controls (avatar dropzone, comboboxes, chip
 * pickers), array-level messages, and anything inside a card that is collapsed at the moment of
 * the submit. Its pick follows registration order, not page order, and it re-focuses from a
 * `setTimeout` after `onInvalid`, so every form using this sets `shouldFocusError: false` —
 * otherwise a lower text field (e.g. Website below the photo box) steals focus and the scroll. This runs after the render that shows the errors (two frames: one to commit the
 * error state and re-open collapsed cards, one for layout), so the DOM it queries is the one the
 * visitor will actually see.
 *
 * Pass the submit event (or the form element). Does nothing when no field error is on screen —
 * a banner-only failure is scrolled to by `FormErrorAlert` itself.
 */
export function revealFirstError(from?: RevealSource): void {
  if (typeof window === 'undefined') return;
  const scope = resolveScope(from);

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const outer = scope.querySelector<HTMLElement>(FIELD_ERROR_SELECTOR);
      const target = innermostError(scope);
      if (!outer || !target) return;

      // Focus without scrolling first, then scroll to a CENTERED position: the browser's own
      // focus-scroll would leave the field flush against the sticky header or the pinned bar.
      const control = target.matches(FOCUSABLE_SELECTOR)
        ? target
        : (target.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
          outer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR));
      control?.focus({ preventScroll: true });

      // Show the control AND the message explaining it — the first message under the same
      // wrapper that comes after the control (a schedule row's error sits below its triggers).
      const rect = target.getBoundingClientRect();
      let bottom = rect.bottom;
      const message = Array.from(
        outer.querySelectorAll<HTMLElement>('[data-slot="form-message"]'),
      ).find((node) => node === target || target.compareDocumentPosition(node) & 4);
      if (message) {
        const messageRect = message.getBoundingClientRect();
        // Only when it is close by — never stretch the band across a whole long form.
        if (messageRect.bottom - rect.top < window.innerHeight / 2) {
          bottom = Math.max(bottom, messageRect.bottom);
        }
      }
      revealBand(rect.top, bottom);
    }),
  );
}

/**
 * Drop-in `onInvalid` for `form.handleSubmit(onValid, revealOnInvalid)`: a client-side refusal
 * takes the visitor to the first error instead of leaving them to hunt for it.
 */
export function revealOnInvalid(_errors: unknown, event?: RevealSource): void {
  revealFirstError(event);
}
