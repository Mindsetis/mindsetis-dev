'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from '@/i18n/navigation';

type UnsavedChangesContextValue = {
  /** Whether the section editor currently mounted anywhere under this provider has unsaved
   * edits — reported by whichever cabinet form is on screen via `useSectionDirtyGuard`. */
  isDirty: boolean;
  /** `useSectionDirtyGuard`'s own plumbing; not meant to be called directly from a component. */
  setDirty: (dirty: boolean) => void;
  /**
   * Runs `action` immediately when the tree is clean. When dirty, opens the ONE shared "unsaved
   * changes" `AlertDialog` instead and defers `action` until the visitor confirms "Leave" (a
   * "Stay" simply drops it). Every exit path in a cabinet section editor — the top "All
   * sections" link, the sidebar, the header, the account menu, the section form's own "Back" —
   * funnels through this single function, so there is exactly one dialog instance on the page,
   * never one per call site (Release-1 C-continuation, 2026-09-19).
   */
  guard: (action: () => void) => void;
};

/**
 * Default context value used everywhere OUTSIDE an active edit — i.e. almost the entire app,
 * almost all the time. `isDirty` is permanently `false` and `guard` runs its action immediately,
 * so `GuardedLink`/`StepActions` behave exactly like a plain `Link`/immediate navigation unless a
 * cabinet section form is actually mounted and actually dirty. This means the single
 * `UnsavedChangesProvider` mounted in the root layout is safe to sit above EVERY route (marketing
 * pages, auth, the onboarding wizard) without any of them needing to know it exists.
 */
const noopContextValue: UnsavedChangesContextValue = {
  isDirty: false,
  setDirty: () => {},
  guard: (action) => action(),
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>(noopContextValue);

/**
 * Where a confirmed "Leave" goes when the exit came from the browser's Back button (every other
 * exit path already carries its own destination). The cabinet overview is where the visitor almost
 * always came from — each section editor is opened from one of its cards.
 */
const SECTION_EXIT_HREF = '/dashboard/profile';

export function useUnsavedChanges(): UnsavedChangesContextValue {
  return useContext(UnsavedChangesContext);
}

/**
 * Reports one cabinet section form's live `isDirty` (RHF `formState.isDirty`, or `ReelLifeForm`'s
 * own hand-rolled equivalent) up to the provider, so every OTHER component on the page —
 * `GuardedLink`s in the header/sidebar, `StepActions`' own "Back" — can decide whether leaving
 * needs confirmation, without each of them needing a prop threaded down from the form itself.
 *
 * Pass `false` (never `isDirty && …` collapsed away) when the caller isn't actually editing in
 * cabinet mode — every one of the eleven form components this feeds is SHARED with the
 * `/mindsetter-onboarding/*` wizard, and the wizard must stay completely untouched by this
 * feature (its own `StepActions` branch and navigation are unaffected either way, but the wizard
 * ALSO renders the site Header/sidebar-less layout under the same root provider, so a wizard step
 * left dirty would otherwise arm the guard for a page that never asked for it).
 *
 * The cleanup effect (not the sync one) is what makes "leaving clears the flag" hold for every
 * exit, not just a successful save: whatever unmounts this form — a confirmed "Leave", a
 * successful `router.push` after Save, or anything else — always fires it, so the NEXT page never
 * inherits a stale dirty flag it never set itself.
 */
export function useSectionDirtyGuard(isDirty: boolean): void {
  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  useEffect(() => {
    return () => setDirty(false);
    // Cleanup-only effect — intentionally not re-run when `setDirty` identity changes (it never
    // does; it's a stable `useCallback` in the provider) so this only fires on actual unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Wraps the whole app (mounted once, in `app/[locale]/layout.tsx`) with the "unsaved changes"
 * guard used by the cabinet's section editors (Release-1 C-continuation, 2026-09-19). Owns the
 * single `AlertDialog` instance every guarded exit shares — see `guard`'s own doc comment above
 * for why centralizing it here rather than duplicating `StepActions`' old per-component dialog.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('dashboard.profile.unsavedChanges');
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const setDirty = useCallback((next: boolean) => setIsDirty(next), []);

  /**
   * Mirrors `pendingAction` (the React state that actually opens the dialog) in a ref, so the
   * `popstate` handler below can read "is a confirmation already pending?" SYNCHRONOUSLY without
   * needing `pendingAction` in its own effect's dependency array (which would tear down and
   * reattach the `window` listener on every open/close — churny, and not needed once the value is
   * available via a ref instead). Written together with `setPendingAction` everywhere the latter
   * is called, so the two can never drift.
   */
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Stable identity (empty deps — the body only ever touches the ref above and `setPendingAction`,
  // React's own stable setter) so including it in `guard`'s dependency array below doesn't make
  // `guard` itself recreate on every render.
  const setPending = useCallback((action: (() => void) | null) => {
    pendingActionRef.current = action;
    // `useState`'s setter treats a function ARGUMENT as an updater — wrapping `action` in an
    // arrow is what stores the function ITSELF as the state value instead of invoking it.
    setPendingAction(() => action);
  }, []);

  // Recreated whenever `isDirty` changes — cheap, and simpler than a ref-based stable identity: the
  // context value object below is already a fresh literal on every provider render regardless (it
  // isn't `useMemo`d), so a stable `guard` reference would buy nothing extra here.
  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPending(action);
        return;
      }
      action();
    },
    [isDirty, setPending],
  );

  /**
   * Short-lived escape hatch for a CONFIRMED exit (coordinator fix, 2026-09-19 — replaces an
   * earlier `setIsDirty(false)` in the "Leave" handler, reverted here: that changed the provider's
   * `isDirty` directly, out of band from the section form's own RHF state, so `useSectionDirtyGuard`
   * had nothing to re-sync from — if the confirmed action turned out NOT to actually unmount the
   * form (see Defect 1: `history.go(-2)` silently doing nothing in a history-less tab; the same
   * applies to any guarded action that resolves to a no-op or a same-URL navigation), the form was
   * left genuinely dirty while the guard now believed — permanently — that it wasn't; `beforeunload`
   * and the Back-button trap stayed disarmed for the rest of the session with nothing to re-arm
   * them).
   *
   * `bypassRef` fixes the ORIGINAL problem (native "Leave site?" stacking on top of our own dialog
   * on the Back-button path, since `history.go(-2)` can cross into an entry the browser reloads as
   * a document) without touching `isDirty` at all: both the `beforeunload` handler and the
   * `popstate` handler check it and stand down while it's `true`, for the ~1.5s a same-tab
   * client-side exit needs to actually complete. It self-clears on a timer rather than waiting for
   * anything to confirm the exit happened, because "did it happen" isn't reliably observable from
   * here — if it DID, the section unmounts and `useSectionDirtyGuard`'s cleanup reports `isDirty`
   * false on its own before the timer even matters; if it DIDN'T, the guard is exactly where it
   * should be once the bypass lapses: still armed, because the form is still genuinely dirty.
   */
  const bypassRef = useRef(false);
  const bypassTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bypassTimeoutRef.current) clearTimeout(bypassTimeoutRef.current);
    };
  }, []);

  // Stable identity (empty deps, same reasoning as `setPending` above) — only ever touches the two
  // refs, so a component referencing a "stale" copy of this from an earlier render behaves
  // identically to calling the latest one.
  const bypassGuardsBriefly = useCallback(() => {
    bypassRef.current = true;
    if (bypassTimeoutRef.current) clearTimeout(bypassTimeoutRef.current);
    bypassTimeoutRef.current = setTimeout(() => {
      bypassRef.current = false;
      bypassTimeoutRef.current = null;
    }, 1500);
  }, []);

  // The one exit this component genuinely cannot replace with `AlertDialog`: a reload or tab
  // close never gives React another chance to run, so there is no dialog to show — the browser's
  // own native prompt is the only possible warning for that specific path. Armed only while
  // actually dirty, and always torn down in cleanup, so a clean page never carries a stray
  // listener (and so the dialog above is never fighting a second, browser-native one).
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      // See `bypassGuardsBriefly` — a confirmed exit already got its ONE confirmation from our own
      // dialog; this stands down for a moment rather than piling the browser's native prompt on
      // top of it.
      if (bypassRef.current) return;
      event.preventDefault();
      // Legacy requirement for the prompt to actually show in some browsers; the string itself is
      // never displayed (every modern browser shows its own fixed copy).
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  /**
   * Browser Back/Forward button (follow-up, 2026-09-19). `router.beforePopState` — the one hook
   * that could have intercepted this cleanly — is Pages Router only and does not exist in the App
   * Router, so this uses the classic "sentinel history entry" technique instead, entirely through
   * the plain `window.history`/`popstate` API:
   *
   * The moment the section goes dirty, this pushes ONE extra history entry at the SAME URL
   * (`history.pushState`, no navigation, nothing visibly changes). That entry silently "absorbs"
   * the visitor's first Back press: the browser pops it and fires `popstate`, landing back on the
   * ORIGINAL entry — same URL, same rendered page, so nothing appears to have happened — and
   * that's the moment this re-arms (pushes a fresh sentinel) and opens the SAME shared dialog via
   * `guard`. "Leave" clears `guardActiveRef` and navigates EXPLICITLY to `SECTION_EXIT_HREF` — see
   * "Leaving by Back" below. "Stay" (`AlertDialogCancel`) leaves `guardActiveRef` untouched — still
   * armed, still on the same sentinel entry — so a later Back press is caught the same way again.
   *
   * LEAVING BY BACK — why this does NOT walk the history stack. Two earlier attempts tried to
   * reproduce the press the visitor actually made, by counting entries and calling
   * `history.go(-2)` (one step for the sentinel just re-armed, one for the sentinel armed when the
   * section went dirty). Both failed the same way in a tab opened straight at a section URL, where
   * there is no in-app page behind it:
   *   - plain `go(-2)`: out of range, and the History API resolves that as a SILENT no-op — the
   *     visitor stayed put right after confirming "Leave", with the Back button dead for the rest
   *     of the tab;
   *   - `go(-2)` gated on `history.length > 1`: a fresh tab already counts `about:blank` as an
   *     entry, so the gate read "there is something behind" and Back landed on `about:blank`
   *     (measured live, twice, 2026-09-19).
   * `history.length` cannot tell an in-app entry from `about:blank` or from another origin, and a
   * `popstate` handler cannot see how deep the real stack is, so no amount of arithmetic here is
   * trustworthy. The guard therefore stops trying to be the Back button and simply LEAVES, by an
   * explicit `router.replace` to the cabinet overview — deterministic, no dead ends, no
   * `about:blank`, identical in a fresh tab and a deep session. The visible cost: when the visitor
   * reached the editor from somewhere other than the overview (another section, their public
   * profile), confirming Back drops them on the overview rather than that page. `replace`, not
   * `push`, so the abandoned sentinel isn't left as a forward entry pointing back into the editor.
   *
   * `guardActiveRef` (a ref, not the `isDirty` state) is what the listener itself checks — kept as
   * a ref so ONE listener can stay attached for this provider's entire lifetime (mounted once, at
   * the root) rather than being torn down and reattached on every dirty toggle; a page that was
   * never dirty, or a sentinel left over from an EARLIER dirty section that already saved/left
   * (see the effect below), reads `false` here and this no-ops, handing the press back to Next's
   * own router exactly as if this listener didn't exist.
   *
   * Defect 2 (2026-09-19 review): a trackpad/mouse-button Back gesture still fires `popstate` even
   * while the dialog is already open for a DIFFERENT guarded exit (e.g. a `GuardedLink` click to
   * another section) — this used to blindly call `guard()` again, which silently swapped the
   * pending "Leave" action out from under the visitor (the dialog stayed open and looked
   * unchanged, but confirming it now went to browser history instead of the link they clicked).
   * Fixed by checking `pendingActionRef` (see its own doc comment): if a confirmation is already
   * queued, this still re-arms the sentinel (a real history entry WAS just consumed and must still
   * be absorbed) but leaves the existing pending action alone.
   *
   * ACCEPTED TRADE-OFF, not a bug, but NOT one-time either: going clean (a successful save, or
   * leaving through any OTHER guarded exit) does not try to POP the sentinel it pushed — doing that
   * would need its own `history.go(-1)`, which fires another `popstate` this same listener would
   * have to carefully tell apart from a real visitor Back press, for no real benefit. Left in
   * place, it is simply inert: `guardActiveRef` is already `false` by the time anyone could reach
   * it via Back, so the listener no-ops and Next renders that (same) URL normally. Every section
   * that goes dirty during a session arms (and then abandons) its OWN sentinel this way, so more
   * than one can accumulate in the same tab's history over a longer editing session — each is an
   * independent, harmless, same-page hop the first time the visitor backs out past THAT particular
   * section, never a dead end, never a loop, never the wrong page.
   */
  const guardActiveRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      // See `bypassGuardsBriefly` — a confirmed exit is already mid-flight; don't re-trap it.
      if (bypassRef.current) return;
      if (!guardActiveRef.current) return;

      window.history.pushState({ unsavedGuard: true }, '', window.location.href);

      // Defect 2 — a confirmation is already queued for something else; re-arming the sentinel
      // above is still correct (a real Back press just happened), but the pending action itself
      // is not this handler's to overwrite.
      if (pendingActionRef.current) return;

      guard(() => {
        guardActiveRef.current = false;
        bypassGuardsBriefly();
        // Always an explicit navigation, never `history.go()` — see the "Leaving by Back" note in
        // this component's doc comment for why the stack arithmetic was abandoned.
        router.replace(SECTION_EXIT_HREF);
      });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [guard, router, bypassGuardsBriefly]);

  useEffect(() => {
    if (!isDirty) {
      // Disarm only — see the trade-off note above for why this doesn't also pop the entry.
      guardActiveRef.current = false;
      return;
    }
    window.history.pushState({ unsavedGuard: true }, '', window.location.href);
    guardActiveRef.current = true;
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, guard }}>
      {children}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPending(null);

          // Safety net for the Radix "two modals in one tick" class of bug (see the Log out item
          // in `AccountMenu.tsx` for the instance that was actually hit): whichever modal unmounts
          // last owns `document.body`'s `pointer-events`, and a bad interleaving can leave `none`
          // welded on, making the page unclickable until a reload. Once this dialog is gone and
          // nothing else on the page is still open, the body has no reason to stay locked.
          requestAnimationFrame(() => {
            if (document.querySelector('[data-state="open"][role="dialog"], [role="menu"]')) return;
            document.body.style.removeProperty('pointer-events');
          });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('stay')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = pendingActionRef.current;
                setPending(null);
                // See `bypassGuardsBriefly` — stands the native `beforeunload` prompt and the
                // Back-button trap down for a moment instead of flipping `isDirty` here (that used
                // to desync from the section form's own RHF state whenever the action below turned
                // out not to actually unmount the form).
                bypassGuardsBriefly();
                action?.();
              }}
            >
              {t('leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}
