'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OPTIONAL_COOKIE_CATEGORIES, type OptionalCookieCategory } from '@/lib/cookies/consent';
import { cn } from '@/lib/utils';

import { useCookieConsent } from './CookieConsentProvider';

type Draft = Record<OptionalCookieCategory, boolean>;

function draftFromConsent(consent: ReturnType<typeof useCookieConsent>['consent']): Draft {
  return {
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
    functional: consent?.functional ?? false,
  };
}

/**
 * Manage-cookie-preferences modal — Figma "Manage Cookie Preferences" (`1133:34998` desktop,
 * centered dialog with its own `Overlay` node `1133:31289`) / "Manage Cookie Preferences -
 * Mobile - 375" (`1158:16566`, a bottom sheet with its own `Rectangle` overlay `1158:16606`).
 * CSS dump lines 1593–2420 (desktop) / 2421–3284 (mobile).
 *
 * ONE `Dialog`/`DialogContent`, not two components — the two Figma frames are the same control
 * at two breakpoints (title, description, and action-button ORDER all differ, per the task),
 * reconciled with `md:`-prefixed overrides on a single element rather than duplicating markup.
 *
 * `Dialog`'s `open`/`onOpenChange` is wired straight to the provider's `isPreferencesOpen`/
 * `closePreferences` — Radix funnels Esc, overlay click, AND the close (×) button through
 * `onOpenChange`, so all three "cancel without saving" paths are covered by this one wire; none
 * of them touch `draft`, so no explicit revert logic is needed on top of it.
 *
 * DRAFT STATE. Toggles are local (`draft`) until "Save Preferences" — re-seeded from `consent`
 * every time the dialog transitions to open (not derived inline from `consent`), so a visitor who
 * flips switches, closes without saving, then reopens sees their last SAVED choice again, not
 * their abandoned edits.
 *
 * WHITE WIDGET, DARK SITE — same reasoning as `CookieConsentBanner`. `DialogContent`'s defaults
 * (`bg-card`/dark, `rounded-lg`/12px, centered-only positioning) and `DialogCloseButton`'s
 * default (blue filled disc) are all tuned for the rest of the app's dark surfaces; every one is
 * overridden below to the dump's actual light-widget values — most notably the close button,
 * which the dump draws as a light-grey disc (`#F4F4F4` fill, `#747474` 1px border) with a plain
 * grey ×, not this app's usual blue-filled one.
 *
 * BOTTOM SHEET ON MOBILE. `DialogContent`'s built-in positioning (`fixed top-[50%] left-[50%]
 * translate-*` — a centered dialog) is overridden below `md:` to pin it to the bottom edge full-
 * width instead (`bottom-0 inset-x-0`, square top corners at 24px / `rounded-t-3xl`, square
 * bottom), then the desktop-centered positioning is restored under `md:`. Both breakpoints stay
 * literally the same `<DialogContent>` element/animation lifecycle — only the CSS differs.
 *
 * DUMP/FIGMA DISCREPANCY (flagging per the task brief): the desktop CSS dump marks the long
 * description paragraph ("Choose which cookies you're okay with. Strictly necessary...") as
 * `display: none`, which would mean it's not actually shown. Re-read directly off the live node
 * (`1133:35003`) via `get_node`: real, non-empty `characters`, normal text styling, and a genuine
 * 57px-tall bounding box inside the frame's own auto-layout flow (not a collapsed 0-height hidden
 * layer) — the same kind of "flat-CSS-export artifact on an otherwise-visible node" already
 * documented elsewhere in this codebase (`AiSearchPreview.tsx`'s chip-icon note). Trusting the
 * live Figma node over that one stray `display: none` line, since the rest of the dump (including
 * the mobile section's own, shorter description) treats this text as visible content, and the
 * task explicitly asks for two different description strings per breakpoint — which only makes
 * sense if both are actually rendered.
 *
 * NO LINK TO `/cookies-policy` HERE — removed on the customer's explicit instruction, matching
 * the Figma frame, which has no such link. Worth knowing what that costs: the footer's "Cookies
 * Settings" entry used to point at that page and now opens this dialog instead, so as of this
 * change nothing in the UI links to `/cookies-policy` at all. The page still exists and still
 * renders; it is simply only reachable by typing the URL. Restoring an entry point (a fourth
 * footer link, or a link inside this dialog) is a content decision, not a code gap.
 */
export function CookiePreferencesDialog() {
  const t = useTranslations('cookies.dialog');
  const { consent, isPreferencesOpen, closePreferences, rejectAll, savePreferences } =
    useCookieConsent();

  const [draft, setDraft] = useState<Draft>(() => draftFromConsent(consent));

  // Re-seed the draft from the last SAVED consent every time the dialog transitions to open —
  // see doc comment above. Adjusted during render (React's documented pattern for "reset state
  // when a value changes", not an Effect) rather than `useEffect`, which would call `setState`
  // after the open paint and cause a visible flash of the stale draft before snapping to the
  // fresh one.
  const [wasOpen, setWasOpen] = useState(isPreferencesOpen);
  if (isPreferencesOpen !== wasOpen) {
    setWasOpen(isPreferencesOpen);
    if (isPreferencesOpen) {
      setDraft(draftFromConsent(consent));
    }
  }

  const descriptionId = useId();

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={descriptionId}
        className={cn(
          'top-auto right-0 bottom-0 left-0 grid w-full max-w-none translate-x-0 translate-y-0 gap-4 rounded-t-3xl rounded-b-none border-0 bg-white p-6 text-black shadow-[0px_-8px_40px_rgba(0,0,0,0.55)]',
          // Four category rows plus two stacked buttons is taller than a phone in landscape, and
          // taller than a portrait phone once the browser chrome is counted — the nominal 812px
          // viewport this was designed against is never the real one. Without a cap the sheet
          // grows past the top of the screen and the title, close button and first category
          // become permanently unreachable (there is no scroll container to reach them with).
          // `dvh`, not `vh`: the unit has to follow the address bar as it collapses.
          'max-h-[85dvh] overflow-y-auto',
          'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-h-[calc(100dvh-4rem)] md:w-full md:max-w-[640px] md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[18px] md:border md:border-[#747474] md:shadow-[0px_24px_60px_rgba(0,0,0,0.55)]',
        )}
      >
        {/* Bottom-sheet drag handle — mobile only, decorative (Figma `1158:16568`). No extra
            margin: `DialogContent`'s own `gap-4` grid already spaces this from the title block
            below by the correct 16px, same as every other direct child. */}
        <div aria-hidden="true" className="flex justify-center md:hidden">
          <div className="h-1 w-10 rounded-full bg-[#747474]" />
        </div>

        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="text-[24px] leading-[24px] font-normal text-black md:text-[22px] md:leading-[29px]">
            <span aria-hidden="true">🥠 </span>
            {t('title')}
          </DialogTitle>
          {/* Light-grey outlined ×, not the app's usual blue disc — see doc comment above. */}
          <DialogCloseButton
            label={t('close')}
            className="size-8 shrink-0 border border-[#747474] bg-[#F4F4F4] text-[#747474] hover:bg-[#eaeaea]"
          />
        </div>

        <p
          id={descriptionId}
          className="text-[16px] leading-[22px] font-medium text-[#2A2A2A] md:text-[14px] md:leading-[19px] md:font-normal"
        >
          <span className="md:hidden">{t('descriptionMobile')}</span>
          <span className="hidden md:inline">{t('description')}</span>
        </p>

        <div className="flex flex-col gap-3 md:gap-2">
          <CategoryRow
            title={t('categories.necessary.title')}
            description={t('categories.necessary.description')}
            checked
            disabled
            alwaysActiveLabel={t('categories.necessary.alwaysActive')}
          />
          {OPTIONAL_COOKIE_CATEGORIES.map((category) => (
            <CategoryRow
              key={category}
              title={t(`categories.${category}.title`)}
              description={t(`categories.${category}.description`)}
              checked={draft[category]}
              onCheckedChange={(next) => setDraft((prev) => ({ ...prev, [category]: next }))}
            />
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button
            variant="outline"
            className="h-[52px] w-full border-[#747474] text-[#000000] hover:border-black hover:text-black active:border-black active:text-black md:w-[175px]"
            onClick={rejectAll}
          >
            {t('rejectAll')}
          </Button>
          <Button
            variant="primary"
            // `max-md:bg-[image:...]` — this widget's Figma frame keeps the gradient on mobile,
            // where `Button`'s `primary` variant is flat by sitewide convention. Same one-class
            // override as the banner's "Accept all"; see `CookieConsentBanner.tsx` for why it's
            // done here rather than in `button.tsx`.
            className="h-[52px] w-full max-md:bg-[image:var(--gradient-primary)] md:w-[175px]"
            onClick={() => savePreferences(draft)}
          >
            {t('savePreferences')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One category row. Desktop lays title+description on the left and the toggle on the right, all
 * on one line (`md:flex-row md:items-center`); mobile stacks title+toggle on one row and the
 * description below it (`flex-col`), matching the two breakpoints' distinct Figma auto-layout
 * (row vs. column) rather than one layout doing double duty via just font-size changes.
 */
function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
  alwaysActiveLabel,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (next: boolean) => void;
  alwaysActiveLabel?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    // ONE GRID, ONE TOGGLE (2026-09-02). Figma's two breakpoints group this row differently —
    // mobile puts the toggle inline with the title and runs the description full-width beneath
    // both, desktop puts the toggle in its own right-hand column, centered against the whole
    // title+description block. That was first built as two separate sub-layouts with a `md:hidden`
    // / `hidden md:flex` pair, which rendered the toggle TWICE per category: eight switches in the
    // DOM for four categories, four of them permanently hidden.
    //
    // A grid expresses both groupings with a single set of children, because a grid item's
    // placement is a property of the item, not of its position in the markup: the toggle moves
    // from (row 1, col 2) to (col 3, spanning both rows and self-centered) purely by changing its
    // placement at `md`, and the description drops from spanning both columns to spanning one.
    // Flex cannot do that — it would need the toggle to be a sibling of the title on one
    // breakpoint and of the description's parent on the other, which is exactly the duplication
    // this replaces.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg bg-[#F4F4F4] p-3 md:grid-cols-[minmax(0,350px)_1fr_auto] md:gap-x-4">
      <h3
        id={titleId}
        className="col-start-1 row-start-1 text-[16px] leading-[22px] font-bold text-black"
      >
        {title}
      </h3>

      <p
        id={descriptionId}
        className="col-span-2 col-start-1 row-start-2 text-[12px] leading-4 text-[#2A2A2A] md:col-span-1 md:text-[14px] md:leading-[19px]"
      >
        {description}
      </p>

      {/* "ALWAYS ACTIVE" is desktop-only — absent from the mobile frame by design, not a missed
          label. Hiding it duplicates nothing: it is a static label, and it only ever exists once. */}
      {alwaysActiveLabel ? (
        <span className="hidden text-[14px] leading-[19px] font-bold tracking-[0.3em] text-black uppercase md:col-start-2 md:row-span-2 md:row-start-1 md:block md:justify-self-end md:self-center">
          {alwaysActiveLabel}
        </span>
      ) : null}

      <div className="col-start-2 row-start-1 md:col-start-3 md:row-span-2 md:row-start-1 md:self-center">
        <CookieToggle
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      </div>
    </div>
  );
}

/**
 * Hand-rolled, not `components/ui/switch.tsx` — that kit component is styled for the dark theme
 * (off track `#747474`, on track `bg-primary`, always-white knob, dims via a flat
 * `disabled:opacity-60` over those same colors) and this widget's toggle uses a DIFFERENT set of
 * colors entirely per the dump: off track `#A5A5A5` (not `#747474`), and — the part the generic
 * component has no state for at all — a disabled+checked look with a GREY knob (`#A5A5A5`, not
 * white) on a `--color-primary-disabled` track at a literal 60% opacity (both breakpoints, dump
 * lines ~1900 / ~2718). Rather than growing the shared kit component a one-off variant only this
 * widget needs, this is a private, purpose-built control for this file, on the same 44×24 track /
 * 20px knob / 2px inset geometry as the kit's own `Switch` (that part IS identical — this only
 * departs on color).
 *
 * A real `disabled` `<button role="switch">`, not a visually-disabled one — the "Strictly
 * Necessary" toggle must be unflippable BY THE PLATFORM, not merely by convention, per the task
 * brief. `disabled` also removes it from tab order, which is correct here (nothing to activate).
 *
 * The CHECKED+ENABLED look (brand-blue track, white knob) isn't in the dump at all — none of the
 * three optional categories are ever shown pre-toggled on. Inferred from the kit `Switch`'s own
 * "on" treatment (`bg-primary`, white knob) as the most consistent choice available; flagged in
 * the handoff report as an assumption, not a confirmed design value.
 */
function CookieToggle({
  checked,
  disabled,
  onCheckedChange,
  titleId,
  descriptionId,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (next: boolean) => void;
  titleId: string;
  descriptionId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-[#79b9e3] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        disabled
          ? 'cursor-not-allowed bg-primary-disabled opacity-60'
          : cn('cursor-pointer', checked ? 'bg-primary' : 'bg-[#A5A5A5]'),
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-5 rounded-full transition-transform',
          disabled ? 'bg-[#A5A5A5]' : 'bg-white',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
