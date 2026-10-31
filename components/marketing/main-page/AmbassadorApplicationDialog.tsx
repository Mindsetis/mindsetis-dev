'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
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
  type AmbassadorContactField,
  ambassadorContactSchemaFor,
  type AmbassadorGuestContactInput,
  MAX_AMBASSADOR_ANSWER_LENGTH,
} from '@/lib/validation/ambassador-application';

export type AmbassadorApplicationStepCopy = {
  eyebrow: string;
  question: string;
  placeholder: string;
};

type FieldCopy = { label: string; placeholder: string };

export type AmbassadorApplicationCopy = {
  close: string;
  /** "Step {current} of {total}" — ICU-free: both placeholders are substituted here, because the
   *  total is 3 or 4 depending on who is applying (see the file comment). */
  stepLabel: string;
  intro: {
    eyebrow: string;
    title: string;
    /** Mentions the contact details — shown when the flow has a "Your details" step. */
    subtitle: string;
    /** Same copy without the contact details — a signed-in applicant with a full profile. */
    subtitleSignedIn: string;
    cta: string;
  };
  /** Exactly 3 entries — the open questions. */
  steps: AmbassadorApplicationStepCopy[];
  /** The contact step — a guest, or a signed-in applicant whose profile lacks a name. */
  details: {
    eyebrow: string;
    /** Guest variant. */
    title: string;
    /** Signed-in variant (only the fields the profile lacks are shown). */
    signedInTitle: string;
    firstName: FieldCopy;
    lastName: FieldCopy;
    email: FieldCopy;
    /** Signed-in variant, ICU-free: `{name}`/`{email}` are substituted here, not by next-intl. */
    signedInAs: string;
    /** Signed-in applicant with a missing name, ICU-free: `{email}` is substituted here. */
    signedInMissing: string;
    privacy: { before: string; link: string; after: string };
    /** Guest typed an address that already has a confirmed account — "Log in" is a link. */
    accountExists: { before: string; link: string; after: string };
  };
  back: string;
  next: string;
  submit: string;
  submitting: string;
  error: string;
  /** Shown instead of `error` when the action is rate-limited (per-IP or per-email). */
  rateLimited: string;
  thanks: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
};

/** The name fields a signed-in applicant's profile can lack (the email always comes from auth). */
export type AmbassadorApplicationViewerMissing = 'firstName' | 'lastName';

/**
 * The signed-in applicant, resolved on the server (`AmbassadorsSection`). `null` for a guest.
 * `missing` lists the name fields the profile does not have — the dialog asks for those and only
 * those, and drops its "Your details" step entirely when the list is empty.
 */
export type AmbassadorApplicationViewer = {
  name: string;
  email: string;
  missing: AmbassadorApplicationViewerMissing[];
} | null;

type AmbassadorApplicationDialogProps = {
  /** "Apply for Ambassadorship" — the entry-point button's own existing label
   *  (`home.main.ambassadors.applyCta`), reused as-is since it lives outside this popup's own
   *  Figma frame. */
  triggerLabel: string;
  copy: AmbassadorApplicationCopy;
  viewer: AmbassadorApplicationViewer;
};

const TOTAL_QUESTION_STEPS = 3;
/** Phases: intro, the three questions (0..2), the details step (if any), then thanks. */
const INTRO_PHASE = -1;
const DETAILS_PHASE = TOTAL_QUESTION_STEPS;
const THANKS_PHASE = TOTAL_QUESTION_STEPS + 1;

/** What a guest is asked for on the details step, in order. */
const GUEST_CONTACT_FIELDS: readonly AmbassadorContactField[] = ['firstName', 'lastName', 'email'];

const EMPTY_ANSWERS = () => Array<string>(TOTAL_QUESTION_STEPS).fill('');
const EMPTY_CONTACT: AmbassadorGuestContactInput = { firstName: '', lastName: '', email: '' };

const EYEBROW_CLASSNAME =
  'text-[11px] leading-[120%] font-bold tracking-[0.3em] text-primary uppercase';

/**
 * "Ambassador Application" popup — Figma "Ambassador Application - Steps" (`1261:16826`, a
 * standalone top-level frame outside the "Main Page" tree).
 *
 * FLOW: intro → three open questions → (contact details, only when needed) → thanks. The three
 * questions and their order are the same for everyone; only the contact step differs:
 * - GUEST: First name / Last name / Email on a fourth step — "Step 1 of 4"…"Step 4 of 4".
 * - SIGNED IN, profile has first + last name (the email always comes from the account): no
 *   contact step. "Submit application" sits on the third question — "Step 1 of 3"…"Step 3 of 3".
 *   (Client "Правки 3.0" П8, 2026-10; before it, they got a fourth step that only said "we'll send
 *   this from your account".) A one-line "from your account: …" hint stays under the last
 *   question so the applicant still sees who the application goes out under.
 * - SIGNED IN, profile lacks a name: a fourth step with inputs for the missing name field(s) only.
 *
 * `submitAmbassadorApplication` decides who is applying from the session itself: it takes name
 * and email from the account, prefers the profile's values over anything typed here, and only
 * accepts a typed name for a field the profile lacks — what `viewer` says is UX, not trust.
 *
 * History: the popup first shipped (2026-09-02) as four question panels — the fourth being
 * "Why do you want to become… which formats…" — with nothing saved or emailed. On 2026-09-29 that
 * panel was replaced by the contact step, and the application started being stored (`ambassador_
 * applications`, service-role write) with a receipt email; the guest's copy of that email also
 * asks them to register with the same address, which is how the application later links to their
 * profile (see the migration's trigger). The three answers are optional.
 *
 * Self-contained like `WhatIsMindsetisVideo`/`AmbassadorsRegionCarousel`: the parent
 * `AmbassadorsSection` is an RSC, so this owns its own `open` state and receives every string as
 * a prop instead of calling `useTranslations` itself. Field-level validation messages still
 * render through `FormMessage`, which decodes the shared `vmsg` keys on its own.
 *
 * PROGRESS BAR grows with `stepNumber / totalSteps` across the counted steps; it is hidden on the
 * intro and on the thanks panel. The "Step N of M" label is built from `copy.stepLabel`.
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

  // Which contact inputs the details step shows: everything for a guest, only the name fields the
  // profile lacks for a signed-in applicant (possibly none → no details step at all).
  const detailFields: readonly AmbassadorContactField[] = viewer
    ? viewer.missing
    : GUEST_CONTACT_FIELDS;
  const hasDetailsStep = detailFields.length > 0;
  const totalSteps = TOTAL_QUESTION_STEPS + (hasDetailsStep ? 1 : 0);

  const contactForm = useForm<AmbassadorGuestContactInput>({
    // Only the fields on screen are enforced; the server re-validates the same set.
    resolver: zodResolver(
      ambassadorContactSchemaFor({
        firstName: detailFields.includes('firstName'),
        lastName: detailFields.includes('lastName'),
        email: detailFields.includes('email'),
      }),
    ),
    mode: 'onTouched',
    defaultValues: EMPTY_CONTACT,
  });

  const isIntro = phase === INTRO_PHASE;
  const isThanks = phase === THANKS_PHASE;
  const isDetails = hasDetailsStep && phase === DETAILS_PHASE;
  const isQuestion = phase >= 0 && phase < TOTAL_QUESTION_STEPS;
  const isCounted = isQuestion || isDetails;
  // The last question submits itself when there is no details step after it.
  const submitsFromQuestion = isQuestion && phase === TOTAL_QUESTION_STEPS - 1 && !hasDetailsStep;

  const stepNumber = phase + 1;
  const progressPercent = (stepNumber / totalSteps) * 100;
  const stepLabel = copy.stepLabel
    .replace('{current}', String(stepNumber))
    .replace('{total}', String(totalSteps));

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
      // Only fields that are on screen can show their message; anything else (e.g. the session
      // ended while the dialog sat open, so the server wanted a guest's contact) is a plain error.
      for (const name of detailFields) {
        const message = fieldErrors[`contact.${name}`]?.[0];
        if (message) {
          contactForm.setError(name, { type: 'server', message });
          placed = true;
        }
      }
      if (!placed) {
        setFormError(result.error.code === 'rate_limited' ? copy.rateLimited : copy.error);
      }
      return;
    }

    setPhase(THANKS_PHASE);
  };

  const onContactSubmit = contactForm.handleSubmit((values) => submit(values));

  const signedInLine = viewer
    ? copy.details.signedInAs.replace('{name}', viewer.name).replace('{email}', viewer.email)
    : null;
  const signedInMissingLine = viewer
    ? copy.details.signedInMissing.replace('{email}', viewer.email)
    : null;

  const errorAlert = formError ? (
    <Alert variant="destructive">
      <AlertDescription>{formError}</AlertDescription>
    </Alert>
  ) : null;

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
            {isIntro ? copy.intro.eyebrow : isThanks ? copy.thanks.eyebrow : stepLabel}
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
              {isIntro
                ? hasDetailsStep
                  ? copy.intro.subtitle
                  : copy.intro.subtitleSignedIn
                : copy.thanks.body}
            </p>
          </div>
        ) : (
          <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
            {isDetails
              ? viewer
                ? copy.details.signedInTitle
                : copy.details.title
              : copy.steps[phase]!.question}
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

        {submitsFromQuestion ? (
          <>
            <p className="text-tiny text-muted-foreground">{signedInLine}</p>
            {errorAlert}
          </>
        ) : null}

        {isDetails ? (
          <Form {...contactForm}>
            <form
              onSubmit={(event) => void onContactSubmit(event)}
              noValidate
              className="flex flex-col gap-4"
            >
              {errorAlert}

              {viewer ? <p className="text-tiny text-foreground">{signedInMissingLine}</p> : null}

              {detailFields.map((name) => (
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

              {/* The privacy line is the guest's consent at the point of leaving contact
                  details; a signed-in applicant agreed to it when creating the account. */}
              {viewer ? null : (
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
        ) : submitsFromQuestion ? (
          // Same stacked-below-`sm:` row as the details step's, for the same width reason.
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
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting ? copy.submitting : copy.submit}
            </Button>
          </div>
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
