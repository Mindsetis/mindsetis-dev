'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type FormEvent, useId, useState } from 'react';
import { useForm } from 'react-hook-form';

import { submitAmbassadorApplication } from '@/app/[locale]/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ACCOUNT_EXISTS_ERROR,
  type AmbassadorGuestContactInput,
  ambassadorGuestContactSchema,
  MAX_AMBASSADOR_ANSWER_LENGTH,
} from '@/lib/validation/ambassador-application';

export type AmbassadorApplicationStepCopy = {
  stepLabel: string;
  eyebrow: string;
  question: string;
  placeholder: string;
};

type FieldCopy = { label: string; placeholder: string };

export type AmbassadorApplicationCopy = {
  close: string;
  intro: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  /** Exactly 3 entries — the open questions, "Step 1 of 4"…"Step 3 of 4". */
  steps: AmbassadorApplicationStepCopy[];
  /** "Step 4 of 4" — who is applying. */
  details: {
    stepLabel: string;
    eyebrow: string;
    title: string;
    firstName: FieldCopy;
    lastName: FieldCopy;
    email: FieldCopy;
    /** Signed-in variant, ICU-free: `{name}`/`{email}` are substituted here, not by next-intl. */
    signedInAs: string;
    privacy: { before: string; link: string; after: string };
    /** Guest typed an address that already has a confirmed account — "Log in" is a link. */
    accountExists: { before: string; link: string; after: string };
  };
  back: string;
  next: string;
  submit: string;
  submitting: string;
  error: string;
  thanks: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
};

/** The signed-in applicant, resolved on the server (`AmbassadorsSection`). `null` for a guest. */
export type AmbassadorApplicationViewer = { name: string; email: string } | null;

type AmbassadorApplicationDialogProps = {
  /** "Apply for Ambassadorship" — the entry-point button's own existing label
   *  (`home.main.ambassadors.applyCta`), reused as-is since it lives outside this popup's own
   *  Figma frame. */
  triggerLabel: string;
  copy: AmbassadorApplicationCopy;
  viewer: AmbassadorApplicationViewer;
};

const TOTAL_QUESTION_STEPS = 3;
/** Phases: intro, the three questions (0..2), the details step, then thanks. */
const INTRO_PHASE = -1;
const DETAILS_PHASE = TOTAL_QUESTION_STEPS;
const THANKS_PHASE = TOTAL_QUESTION_STEPS + 1;
/** Counted steps shown to the applicant: three questions + details. */
const TOTAL_STEPS = TOTAL_QUESTION_STEPS + 1;

const EMPTY_ANSWERS = () => Array<string>(TOTAL_QUESTION_STEPS).fill('');
const EMPTY_CONTACT: AmbassadorGuestContactInput = { firstName: '', lastName: '', email: '' };

const EYEBROW_CLASSNAME =
  'text-[11px] leading-[120%] font-bold tracking-[0.3em] text-primary uppercase';

/**
 * "Ambassador Application" popup — Figma "Ambassador Application - Steps" (`1261:16826`, a
 * standalone top-level frame outside the "Main Page" tree).
 *
 * FLOW (client change, 2026-09-29): intro → three open questions → "Your details" → thanks.
 * Figma's fourth question panel ("Why do you want to become… which formats…") was replaced by
 * the details step. On it a GUEST fills First name / Last name / Email; a signed-in
 * Member/Mindsetter sees one line naming the account the application goes out under — the
 * `submitAmbassadorApplication` action reads that account server-side and ignores any contact
 * fields, so what this panel shows is informational only.
 *
 * Submitting saves the application (`ambassador_applications`, service-role write) and queues a
 * receipt email; the guest's copy of that email also asks them to register with the same address,
 * which is how the application later links to their profile (see the migration's trigger).
 * The three answers are optional, as they were before anything was stored.
 *
 * Copy fixes that came with the same change, both previously flagged against Figma here: steps
 * are numbered "Step 1 of 4"…"Step 4 of 4" (intro and thanks are uncounted — the thanks panel no
 * longer reuses "Step 5 of 5"), and the intro's "Three quick questions" — which used to cover
 * four question panels — now reads "Three quick questions and your contact details", matching
 * the three questions + details step exactly.
 *
 * Self-contained like `WhatIsMindsetisVideo`/`AmbassadorsRegionCarousel`: the parent
 * `AmbassadorsSection` is an RSC, so this owns its own `open` state and receives every string as
 * a prop instead of calling `useTranslations` itself. Field-level validation messages still
 * render through `FormMessage`, which decodes the shared `vmsg` keys on its own.
 *
 * PROGRESS BAR grows with `stepNumber / 4` across the four counted steps; it is hidden on the
 * intro and on the thanks panel.
 *
 * MOBILE: Figma has no mobile frame for this flow at all. Below `sm:` the dialog goes full-width
 * with a 16px gutter on each side (the same un-designed-state shape this page's other dialogs
 * fall back to), keeping the same centered-modal chrome rather than switching to a bottom sheet
 * — not a Figma-sourced layout, just following the rest of the page's own pattern.
 */
export function AmbassadorApplicationDialog({
  triggerLabel,
  copy,
  viewer,
}: AmbassadorApplicationDialogProps) {
  // One `aria-describedby` target, moved between elements per phase so exactly one node ever
  // carries the id: the subtitle on the intro panel, the body on the thanks panel, and the
  // eyebrow on a step panel. Radix warns when a dialog has no description.
  const descriptionId = useId();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState(INTRO_PHASE);
  const [answers, setAnswers] = useState<string[]>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  // Stamped when the dialog opens — the action's minimum-elapsed-time bot filter.
  const [openedAt, setOpenedAt] = useState(0);

  const contactForm = useForm<AmbassadorGuestContactInput>({
    resolver: zodResolver(ambassadorGuestContactSchema),
    mode: 'onTouched',
    defaultValues: EMPTY_CONTACT,
  });

  const isIntro = phase === INTRO_PHASE;
  const isThanks = phase === THANKS_PHASE;
  const isDetails = phase === DETAILS_PHASE;
  const isQuestion = phase >= 0 && phase < TOTAL_QUESTION_STEPS;
  const isCounted = isQuestion || isDetails;

  const stepNumber = phase + 1;
  const progressPercent = (stepNumber / TOTAL_STEPS) * 100;

  const reset = () => {
    setPhase(INTRO_PHASE);
    setAnswers(EMPTY_ANSWERS());
    setSubmitting(false);
    setFormError(null);
    setHoneypot('');
    contactForm.reset(EMPTY_CONTACT);
  };

  const handleOpenChange = (next: boolean) => {
    // Closing mid-submit would drop the result on the floor; the request is short, so just wait.
    if (!next && submitting) return;
    setOpen(next);
    if (next) {
      setOpenedAt(Date.now());
    } else {
      // Reopening always starts at the intro, never resumes where the visitor left off.
      reset();
    }
  };

  const handleNext = () => setPhase((prev) => prev + 1);
  // phase - 1 on the first question step (0) lands on INTRO_PHASE (-1) for free.
  const handleBack = () => {
    setFormError(null);
    setPhase((prev) => prev - 1);
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  const submit = async (contact?: AmbassadorGuestContactInput) => {
    setSubmitting(true);
    setFormError(null);
    const [eventExperience, communities, communitiesFeedback] = answers;
    const result = await submitAmbassadorApplication({
      eventExperience,
      communities,
      communitiesFeedback,
      contact,
      website: honeypot,
      formLoadedAt: openedAt || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      const fieldErrors = result.error.fieldErrors ?? {};
      let placed = false;
      for (const name of ['firstName', 'lastName', 'email'] as const) {
        const message = fieldErrors[`contact.${name}`]?.[0];
        if (message) {
          contactForm.setError(name, { type: 'server', message });
          placed = true;
        }
      }
      if (!placed) setFormError(copy.error);
      return;
    }

    setPhase(THANKS_PHASE);
  };

  const onGuestSubmit = contactForm.handleSubmit((values) => submit(values));
  const onDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (viewer) void submit();
    else void onGuestSubmit(event);
  };

  const signedInLine = viewer
    ? copy.details.signedInAs.replace('{name}', viewer.name).replace('{email}', viewer.email)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" size="lg" className="w-fit" onClick={() => handleOpenChange(true)}>
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
        <div className={cn('flex items-center justify-between', isCounted ? 'gap-3' : 'gap-5')}>
          <span className={isCounted ? 'text-tiny text-muted-foreground' : EYEBROW_CLASSNAME}>
            {isIntro
              ? copy.intro.eyebrow
              : isThanks
                ? copy.thanks.eyebrow
                : isDetails
                  ? copy.details.stepLabel
                  : copy.steps[phase]!.stepLabel}
          </span>
          <DialogCloseButton label={copy.close} />
        </div>

        {isCounted ? (
          <div aria-hidden="true" className="h-2 w-full shrink-0 rounded-full bg-[#2a2a2a]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        ) : null}

        {isCounted ? (
          <span className={EYEBROW_CLASSNAME} id={descriptionId}>
            {isDetails ? copy.details.eyebrow : copy.steps[phase]!.eyebrow}
          </span>
        ) : null}

        {isIntro || isThanks ? (
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
              {isIntro ? copy.intro.title : copy.thanks.title}
            </DialogTitle>
            <p className="text-tiny text-muted-foreground" id={descriptionId}>
              {isIntro ? copy.intro.subtitle : copy.thanks.body}
            </p>
          </div>
        ) : (
          <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
            {isDetails ? copy.details.title : copy.steps[phase]!.question}
          </DialogTitle>
        )}

        {isQuestion ? (
          <Textarea
            value={answers[phase]}
            onChange={(event) => handleAnswerChange(phase, event.target.value)}
            placeholder={copy.steps[phase]!.placeholder}
            aria-label={copy.steps[phase]!.question}
            maxLength={MAX_AMBASSADOR_ANSWER_LENGTH}
            rows={3}
            className="min-h-[92px] rounded-lg border-border p-3 text-tiny"
          />
        ) : null}

        {isDetails ? (
          <Form {...contactForm}>
            <form onSubmit={onDetailsSubmit} noValidate className="flex flex-col gap-4">
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              {viewer ? (
                <p className="text-tiny text-foreground">{signedInLine}</p>
              ) : (
                <>
                  {(['firstName', 'lastName', 'email'] as const).map((name) => (
                    <FormField
                      key={name}
                      control={contactForm.control}
                      name={name}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>
                            <span className="inline-flex items-center gap-1">
                              {copy.details[name].label} <span className="text-primary">*</span>
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type={name === 'email' ? 'email' : 'text'}
                              autoComplete={
                                name === 'email'
                                  ? 'email'
                                  : name === 'firstName'
                                    ? 'given-name'
                                    : 'family-name'
                              }
                              placeholder={copy.details[name].placeholder}
                              {...field}
                            />
                          </FormControl>
                          {fieldState.error?.message === ACCOUNT_EXISTS_ERROR ? (
                            // Same look as `FormMessage`, which can only print a plain string —
                            // this one needs the "Log in" link inline.
                            <p role="alert" className="text-[12px] text-destructive">
                              {copy.details.accountExists.before}
                              <Link
                                href="/login"
                                className="font-bold underline underline-offset-2 hover:text-primary"
                              >
                                {copy.details.accountExists.link}
                              </Link>
                              {copy.details.accountExists.after}
                            </p>
                          ) : (
                            <FormMessage />
                          )}
                        </FormItem>
                      )}
                    />
                  ))}

                  <p className="text-tiny text-muted-foreground">
                    {copy.details.privacy.before}
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      className="text-primary underline underline-offset-2 hover:text-primary-hover"
                    >
                      {copy.details.privacy.link}
                    </Link>
                    {copy.details.privacy.after}
                  </p>
                </>
              )}

              {/* Honeypot — invisible to people and assistive tech; only a form-filling bot types
                  here. Same pattern as `WaitlistFormCard`. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="ambassador-website">Website</label>
                <input
                  id="ambassador-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>

              {/* Stacked below `sm:` — "Back" + "Submit application" side by side are wider than
                  the 343px mobile dialog and would push the whole grid sideways. Submit stays on
                  top there (`flex-col-reverse`), the primary action nearest the fields. */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  {copy.back}
                </Button>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? copy.submitting : copy.submit}
                </Button>
              </div>
            </form>
          </Form>
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
              {copy.next}
            </Button>
          </div>
        ) : isThanks ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => handleOpenChange(false)}
          >
            {copy.thanks.cta}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
