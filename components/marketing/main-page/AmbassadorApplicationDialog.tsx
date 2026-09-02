'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type AmbassadorApplicationStepCopy = {
  stepLabel: string;
  eyebrow: string;
  question: string;
  placeholder: string;
};

export type AmbassadorApplicationCopy = {
  close: string;
  intro: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  /** Exactly 4 entries — Figma's "Step 2 of 5"…"Step 5 of 5" question panels. */
  steps: AmbassadorApplicationStepCopy[];
  back: string;
  next: string;
  submit: string;
  thanks: {
    stepLabel: string;
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
};

type AmbassadorApplicationDialogProps = {
  /** "Apply for Ambassadorship" — the entry-point button's own existing label
   *  (`home.main.ambassadors.applyCta`), reused as-is since it lives outside this popup's own
   *  Figma frame. */
  triggerLabel: string;
  copy: AmbassadorApplicationCopy;
};

const TOTAL_QUESTION_STEPS = 4;
/** Sentinel phase values bracketing the 0..3 question-step range. */
const INTRO_PHASE = -1;
const THANKS_PHASE = TOTAL_QUESTION_STEPS;

const EYEBROW_CLASSNAME =
  'text-[11px] leading-[120%] font-bold tracking-[0.3em] text-primary uppercase';

/**
 * "Ambassador Application" popup — Figma "Ambassador Application - Steps" (`1261:16826`, a
 * standalone top-level frame outside the "Main Page" tree). Visual + step navigation ONLY, per
 * explicit product direction: nothing is persisted (no migration, Server Action, Route Handler,
 * or validation) and no email goes out. "Submit application" just advances to the thank-you
 * panel; typed answers live entirely in this component's own local state and are discarded on
 * close (see `handleOpenChange`).
 *
 * Self-contained like `WhatIsMindsetisVideo`/`AmbassadorsRegionCarousel`: the parent
 * `AmbassadorsSection` is an RSC, so this owns its own `open` state and receives every string as
 * a prop instead of calling `useTranslations` itself.
 *
 * TWO KNOWN FIGMA INCONSISTENCIES, kept verbatim per product direction (visual accuracy over
 * silently fixing the copy) — flagged for the product owner, not corrected here:
 * - the intro subtitle promises "Three quick questions" (`1261:16834`) but there are four
 *   separate question panels (`1261:16837` / `1261:16853` / `1270:24735` / `1261:16869`).
 * - steps 3 and 4's textarea placeholder is identical — "Tell us what you loved and what you'd
 *   improve..." (`1261:16863` / `1270:24744`) — even though the two questions differ.
 *
 * STEP NUMBERING, also kept verbatim per product direction: the intro carries no step number,
 * the four question panels are labelled "Step 2 of 5"…"Step 5 of 5" (`1261:16839` etc. — i.e.
 * the intro is treated as the uncounted "step 1"), and the thank-you panel is STILL "Step 5 of
 * 5" (`1261:16887`) rather than a distinct final step. This reads as a numbering bug in the
 * source file; the alternative is renumbering to "Step 1 of 4"…"Step 4 of 4" (question steps
 * only) with no step label on the thank-you panel — left for the product owner to decide.
 *
 * PROGRESS BAR: Figma draws the exact same 200-of-424px "Fill" (e.g. `1261:16843`) on every
 * single panel that has one — i.e. the designer never varied it, so there's no real design
 * signal being reproduced by copying that number. Deliberately NOT done that way here: the fill
 * below actually grows with `stepNumber / 5` (40% → 100% across the four question steps,
 * staying at 100% on the thank-you panel) — a conscious departure from the flat mock, since a
 * progress bar that never moves isn't one.
 *
 * MOBILE: Figma has no mobile frame for this flow at all. Below `sm:` the dialog goes full-width
 * with a 16px gutter on each side (the same un-designed-state shape this page's other dialogs
 * fall back to), keeping the same centered-modal chrome rather than switching to a bottom sheet
 * — not a Figma-sourced layout, just following the rest of the page's own pattern.
 */
export function AmbassadorApplicationDialog({
  triggerLabel,
  copy,
}: AmbassadorApplicationDialogProps) {
  // One `aria-describedby` target, moved between elements per phase so exactly one node ever
  // carries the id: the subtitle on the intro panel, the body on the thanks panel, and the
  // eyebrow on a question panel (whose title IS the question, so the eyebrow is what describes
  // it). Radix warns when a dialog has no description, and a screen reader otherwise announces
  // the title with no context.
  const descriptionId = useId();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState(INTRO_PHASE);
  const [answers, setAnswers] = useState<string[]>(() => Array(TOTAL_QUESTION_STEPS).fill(''));

  const isIntro = phase === INTRO_PHASE;
  const isThanks = phase === THANKS_PHASE;
  const isQuestion = !isIntro && !isThanks;
  const isLastQuestion = phase === TOTAL_QUESTION_STEPS - 1;

  // Figma numbers the four question steps "Step 2 of 5"..."Step 5 of 5" (see doc comment) —
  // reused as-is for the progress math so the bar's growth matches the visible label.
  const stepNumber = isThanks ? 5 : phase + 2;
  const progressPercent = (stepNumber / 5) * 100;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reopening always starts at the intro, never resumes where the visitor left off — and
      // clears whatever was typed, since nothing here is meant to be persisted.
      setPhase(INTRO_PHASE);
      setAnswers(Array(TOTAL_QUESTION_STEPS).fill(''));
    }
  };

  const handleNext = () => {
    setPhase((prev) => {
      if (prev === INTRO_PHASE) return 0;
      if (prev < TOTAL_QUESTION_STEPS - 1) return prev + 1;
      return THANKS_PHASE;
    });
  };

  const handleBack = () => {
    // phase - 1 on the first question step (0) lands on INTRO_PHASE (-1) for free.
    setPhase((prev) => prev - 1);
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" size="lg" className="w-fit" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      <DialogContent
        showCloseButton={false}
        aria-describedby={descriptionId}
        className={cn(
          'w-[calc(100%-32px)] max-w-[480px] gap-5 rounded-[18px] border-border bg-card p-7',
          'max-h-[90vh] overflow-y-auto shadow-[0px_24px_60px_rgba(0,0,0,0.55)]',
        )}
      >
        <div className={cn('flex items-center justify-between', isIntro ? 'gap-5' : 'gap-3')}>
          <span className={isIntro ? EYEBROW_CLASSNAME : 'text-tiny text-muted-foreground'}>
            {isIntro
              ? copy.intro.eyebrow
              : isThanks
                ? copy.thanks.stepLabel
                : copy.steps[phase]!.stepLabel}
          </span>
          <DialogCloseButton label={copy.close} />
        </div>

        {!isIntro ? (
          <div aria-hidden="true" className="h-2 w-full shrink-0 rounded-full bg-[#2a2a2a]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}

        {!isIntro ? (
          <span className={EYEBROW_CLASSNAME} id={isThanks ? undefined : descriptionId}>
            {isThanks ? copy.thanks.eyebrow : copy.steps[phase]!.eyebrow}
          </span>
        ) : null}

        {isIntro ? (
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
              {copy.intro.title}
            </DialogTitle>
            <p className="text-tiny text-muted-foreground" id={descriptionId}>
              {copy.intro.subtitle}
            </p>
          </div>
        ) : isThanks ? (
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
              {copy.thanks.title}
            </DialogTitle>
            <p className="text-tiny text-muted-foreground" id={descriptionId}>
              {copy.thanks.body}
            </p>
          </div>
        ) : (
          <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
            {copy.steps[phase]!.question}
          </DialogTitle>
        )}

        {isQuestion ? (
          <Textarea
            value={answers[phase]}
            onChange={(event) => handleAnswerChange(phase, event.target.value)}
            placeholder={copy.steps[phase]!.placeholder}
            aria-label={copy.steps[phase]!.question}
            rows={3}
            className="min-h-[92px] rounded-lg border-border p-3 text-tiny"
          />
        ) : null}

        {isIntro ? (
          <Button type="button" size="lg" className="w-full" onClick={handleNext}>
            {copy.intro.cta}
          </Button>
        ) : isQuestion ? (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" size="lg" onClick={handleBack}>
              {copy.back}
            </Button>
            <Button type="button" size="lg" onClick={handleNext}>
              {isLastQuestion ? copy.submit : copy.next}
            </Button>
          </div>
        ) : (
          <Button type="button" size="lg" className="w-full" onClick={() => setOpen(false)}>
            {copy.thanks.cta}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
