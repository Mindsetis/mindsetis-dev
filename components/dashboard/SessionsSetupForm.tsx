'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SVGProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { type Control, useController, useForm, useWatch } from 'react-hook-form';

import { saveSessionSettings } from '@/app/[locale]/dashboard/sessions/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { WeeklyAvailabilityField } from '@/components/dashboard/WeeklyAvailabilityField';
import {
  ShineOptionCheckedIcon,
  ShineOptionUncheckedIcon,
} from '@/components/icons/shine-block-icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldHint } from '@/components/ui/field-hint';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { cn } from '@/lib/utils';
import { isLatinOnly, LATIN_ONLY_MESSAGE } from '@/lib/validation/common';
import {
  emptyWeeklyAvailability,
  MAX_CUSTOM_SESSION_TOPICS,
  MAX_SESSION_TOPICS,
  MAX_TOPIC_LENGTH,
  SESSION_DURATIONS,
  type SessionStepInput,
  sessionStepSchema,
  type WeeklyAvailability,
} from '@/lib/validation/mindsetter';

export type SessionsSetupFormProps = {
  /** `mindsetter_profiles.help_with` card titles — the suggested topics. */
  topicOptions: string[];
  initialSettings?: {
    acceptsBookings: boolean;
    sessionType: 'free' | 'paid';
    priceCents: number | null;
    durations: number[];
    topics: string[];
    timezone: string;
    weeklyAvailability: WeeklyAvailability;
    feeConsentAccepted: boolean;
  };
};

/** Banknote glyph for the Payout Guarantee box — supplied by the designer (2026-08-14), replacing
 * `lucide-react`'s outline `Banknote`. Native 19×19; the source's `#08D6AD` IS `--color-success`,
 * so it renders `currentColor` and takes that from the call site. */
function PayoutGuaranteeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 19 19" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14.6821 1.99363C15.0875 1.88503 15.5194 1.94137 15.8829 2.1511C16.2466 2.36106 16.5122 2.70737 16.6209 3.11299L18.424 9.8424C18.5326 10.2479 18.4755 10.6799 18.2656 11.0435C18.0556 11.4071 17.7102 11.6725 17.3046 11.7812L4.15145 15.3056C3.74595 15.4141 3.31393 15.3571 2.95039 15.1472C2.58684 14.9372 2.32139 14.5917 2.21267 14.1862L0.409529 7.4568C0.300845 7.05119 0.35772 6.61846 0.567683 6.25479C0.777594 5.89139 1.12354 5.62675 1.52889 5.51802L14.6821 1.99363ZM3.65959 13.4699L5.72445 12.9167C5.49405 12.4803 5.11997 12.1366 4.66533 11.9448C4.21057 11.7529 3.70283 11.7249 3.22941 11.8645L3.65959 13.4699ZM16.3826 8.34007C15.903 8.45585 15.4781 8.73404 15.1802 9.12733C14.8823 9.52078 14.7293 10.0057 14.7479 10.4988L16.8128 9.94554L16.3826 8.34007ZM8.72018 6.0499C8.03067 6.23468 7.4426 6.68555 7.08568 7.30375C6.72883 7.92195 6.63232 8.6567 6.81707 9.34619C7.00186 10.0357 7.45273 10.6238 8.07091 10.9807C8.68911 11.3376 9.42385 11.434 10.1134 11.2493C10.8028 11.0646 11.3909 10.6136 11.7478 9.99545C12.1048 9.37727 12.2012 8.64251 12.0165 7.95301C11.8317 7.26348 11.3808 6.67546 10.7626 6.31852C10.1444 5.96158 9.40973 5.86514 8.72018 6.0499ZM2.45093 8.95913C2.93075 8.8433 3.35615 8.56424 3.65407 8.17068C3.95188 7.77715 4.10411 7.2926 4.08534 6.79944L2.02049 7.35271L2.45093 8.95913ZM13.1088 4.3816C13.3392 4.81815 13.7141 5.16136 14.1689 5.35324C14.6236 5.54502 15.1308 5.57432 15.6041 5.43475L15.1737 3.82833L13.1088 4.3816Z" />
    </svg>
  );
}

/** Card chrome shared by the page's sections: 16px radius, #1a1a1a fill, #2a2a2a hairline. */
function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-xl border border-[#2a2a2a] bg-card p-4 lg:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-foreground lg:font-normal">{title}</h2>
        {description ? <p className="text-tiny text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** "Available durations" — MULTI-select now, unlike the wizard's single pick. */
function DurationsField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('dashboard.sessions.price');
  const tSession = useTranslations('mindsetterOnboarding.session');
  const { field, fieldState } = useController({ control, name: 'durations' });
  const tValidation = useValidationMessage();
  const selected = field.value;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
        {t('durationsLabel')}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {SESSION_DURATIONS.map((minutes) => {
          const isOn = selected.includes(minutes);
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={isOn}
              onClick={() =>
                field.onChange(
                  isOn ? selected.filter((value) => value !== minutes) : [...selected, minutes],
                )
              }
              // Selected is a SOLID brand fill with black text and no icon — unlike the topic
              // chips below, which stay dark and mark themselves with a check. Two different
              // chip treatments in one page, both straight from the frame.
              // All four share the row on a phone (`flex-1`, tighter padding) — at `px-5` the
              // fourth wrapped onto its own line, which the frame never does.
              className={cn(
                'inline-flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl px-2 text-base font-medium transition-colors lg:flex-none lg:px-5',
                isOn
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-transparent text-foreground hover:border-foreground',
              )}
            >
              {tSession('durationOption', { minutes })}
            </button>
          );
        })}
      </div>
      {fieldState.error?.message ? (
        <p className="text-tiny text-destructive">{tValidation(fieldState.error.message)}</p>
      ) : null}
    </div>
  );
}

/** Free / Paid radio cards with the price nested inside the Paid one, as the frame draws it. */
function PriceSection({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('dashboard.sessions.price');
  const tSession = useTranslations('mindsetterOnboarding.session');

  return (
    <FormField
      control={control}
      name="sessionType"
      render={({ field }) => (
        <FormItem>
          {/* Mobile-only eyebrow — the desktop frame doesn't carry one. */}
          <p className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase lg:hidden">
            {t('indicateLabel')}
          </p>

          {/* Two columns at EVERY width — the mobile frame keeps them side by side rather than
              stacking. Inside, the order flips: phone stacks dot → label → amount, desktop puts
              the dot and the amount on one row with the label under them. DOM order is the mobile
              one; `lg` re-places the cells explicitly. */}
          <div role="radiogroup" aria-label={t('title')} className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={field.value === 'free'}
              onClick={() => field.onChange('free')}
              className="grid cursor-pointer grid-cols-1 gap-2 rounded-xl border border-border bg-transparent p-4 text-left transition-colors hover:border-foreground lg:grid-cols-[auto_1fr] lg:p-5"
            >
              {field.value === 'free' ? <ShineOptionCheckedIcon /> : <ShineOptionUncheckedIcon />}
              <span className="text-base font-bold text-primary lg:col-span-2 lg:row-start-2">
                {tSession('free.label')}
              </span>
              <span className="font-display text-[32px] leading-none text-foreground lg:col-start-2 lg:row-start-1 lg:justify-self-end">
                {tSession('free.value')}
              </span>
            </button>

            <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-transparent p-4 lg:grid-cols-[auto_1fr] lg:p-5">
              <button
                type="button"
                role="radio"
                aria-checked={field.value === 'paid'}
                onClick={() => field.onChange('paid')}
                className="flex w-fit cursor-pointer items-center"
              >
                {field.value === 'paid' ? <ShineOptionCheckedIcon /> : <ShineOptionUncheckedIcon />}
              </button>

              <span className="text-base font-bold text-primary lg:col-span-2 lg:row-start-2">
                {tSession('paid.label')}
              </span>

              <div className="flex items-center gap-2 lg:col-start-2 lg:row-start-1 lg:justify-self-end">
                <span
                  aria-hidden="true"
                  className="shrink-0 font-display text-[32px] leading-none text-foreground"
                >
                  $
                </span>
                <FormField
                  control={control}
                  name="priceCents"
                  render={({ field: priceField }) => (
                    <FormItem className="min-w-0">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step="1"
                          inputMode="decimal"
                          placeholder={tSession('priceInputPlaceholder')}
                          className="h-12 w-full min-w-0 rounded-xl lg:w-[130px]"
                          value={priceField.value == null ? '' : priceField.value / 100}
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === '') {
                              priceField.onChange(null);
                              return;
                            }
                            const dollars = Number(raw);
                            priceField.onChange(
                              Number.isNaN(dollars) ? null : Math.round(dollars * 100),
                            );
                          }}
                        />
                      </FormControl>
                      {/* Inside the field's own item so "Enter a price greater than $0." lands
                          under the price input rather than under the radio group. */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <FormMessage />
          <FieldHint centerIcon className="text-muted-foreground">
            {t('changeAnytime')}
          </FieldHint>
        </FormItem>
      )}
    />
  );
}

/**
 * Session topics — the selected set plus an "Add topic" dialog.
 *
 * The frame's dialog offers a search box and a "SUGGESTED FOR YOUR INDUSTRY" list. There is no
 * topic catalogue in the product yet, so the suggestions here are this Mindsetter's own "What I
 * help with" titles — the only real topic source that exists — and anything else is typed in.
 * Wiring a per-industry catalogue is its own piece of work.
 */
function TopicsField({
  control,
  options,
}: {
  control: Control<SessionStepInput>;
  options: string[];
}) {
  const t = useTranslations('dashboard.sessions.topics');
  const { field, fieldState } = useController({ control, name: 'topics' });
  const tValidation = useValidationMessage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const selected = field.value;
  const atMax = selected.length >= MAX_SESSION_TOPICS;
  const customCount = selected.filter((topic) => !options.includes(topic)).length;

  // Everything offered as a chip: the Help-step titles, plus any custom topic already picked (so
  // it keeps rendering after a save rather than vanishing from the list it isn't part of).
  const pool = Array.from(new Set([...options, ...selected]));

  const suggestions = options.filter(
    (option) =>
      !selected.includes(option) && option.toLowerCase().includes(draft.trim().toLowerCase()),
  );

  // A custom topic is typed here and pushed straight into the field array, so it never passes
  // through a `FormField`/`FormMessage` of its own — the live Latin check that every other text
  // field gets for free has to be wired by hand (message rendered under the input below).
  const draftHasNonLatin = draft.trim().length > 0 && !isLatinOnly(draft);

  function add(topic: string) {
    const trimmed = topic.trim();
    if (!trimmed || selected.includes(trimmed) || atMax) return;
    if (!isLatinOnly(trimmed)) return;
    if (!options.includes(trimmed) && customCount >= MAX_CUSTOM_SESSION_TOPICS) return;
    field.onChange([...selected, trimmed]);
    setDraft('');
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The card lists the whole pool — this Mindsetter's "What I help with" titles plus anything
          they've added — with the picked ones marked, exactly as the frame draws it. Tapping a chip
          toggles it; the dialog is only for introducing a topic that isn't in the list yet. */}
      <div className="flex flex-wrap gap-2.5">
        {pool.map((topic) => {
          const isOn = selected.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              aria-pressed={isOn}
              disabled={!isOn && atMax}
              onClick={() =>
                field.onChange(
                  isOn ? selected.filter((item) => item !== topic) : [...selected, topic],
                )
              }
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-base font-medium transition-colors',
                isOn
                  ? 'border-primary text-primary'
                  : 'border-border text-foreground hover:border-foreground',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {isOn ? <ShineOptionCheckedIcon /> : null}
              {topic}
            </button>
          );
        })}

        <button
          type="button"
          disabled={atMax}
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-base font-medium text-foreground transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('add')}
        </button>
      </div>

      {fieldState.error?.message ? (
        <p className="text-tiny text-destructive">{tValidation(fieldState.error.message)}</p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>{t('dialogHint')}</DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            maxLength={MAX_TOPIC_LENGTH}
            value={draft}
            placeholder={t('searchPlaceholder')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add(draft);
              }
            }}
          />

          {draftHasNonLatin ? (
            <p role="alert" className="text-tiny text-destructive">
              {tValidation(LATIN_ONLY_MESSAGE)}
            </p>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {t('suggested')}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => add(topic)}
                    className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-base text-foreground transition-colors hover:border-foreground"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <Button type="button" variant="primary" size="lg" onClick={() => add(draft)}>
            {t('addConfirm')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * "Europe / Kyiv · GMT+3" — the label the frame shows, offset included.
 *
 * The offset is part of the LABEL rather than a secondary line, because the frame renders both on
 * one row in the trigger; `Combobox`'s own `description`/`triggerDescription` slots stack instead.
 * `Intl` failures fall back to the bare zone name — a picker without offsets still works, an
 * exception during render does not.
 */
function timezoneLabel(zone: string): string {
  const name = zone.replace(/_/g, ' ').replace(/\//g, ' / ');
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value;
    return offset ? `${name} · ${offset}` : name;
  } catch {
    return name;
  }
}

/** IANA timezone picker, auto-detected on first use. */
function TimezoneField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding.session');
  const { field } = useController({ control, name: 'timezone' });

  const options = useMemo<ComboboxOption[]>(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch {
      zones = [];
    }
    const mapped = zones.map((zone) => ({ value: zone, label: timezoneLabel(zone) }));
    if (field.value && !mapped.some((option) => option.value === field.value)) {
      return [{ value: field.value, label: timezoneLabel(field.value) }, ...mapped];
    }
    return mapped;
  }, [field.value]);

  useEffect(() => {
    if (field.value) return;
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) field.onChange(detected);
    } catch {
      // Intl unavailable — the schema's "Timezone is required." surfaces on submit.
    }
    // Detection is a default, not something to re-apply over a later pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* A plain `Label`, NOT `FormLabel`: the latter calls `useFormField()`, which throws unless
          it sits inside a `FormField`/`FormItem` pair — this field is driven by `useController`
          directly, so there is no such context and the page crashed on render. */}
      <Label>
        {t('timezoneLabel')} <span className="text-primary">*</span>
      </Label>
      <Combobox
        value={field.value ?? ''}
        onChange={field.onChange}
        options={options}
        searchable
        placeholder={t('timezonePlaceholder')}
        searchPlaceholder={t('timezoneSearchPlaceholder')}
        emptyLabel={t('timezoneEmpty')}
      />
    </div>
  );
}

/** Platform-set refund windows — copy only, nothing here is editable by the Mindsetter. */
function CancellationPolicyCard() {
  const t = useTranslations('dashboard.sessions.cancellation');

  // The refund line takes the same colour as its bar — the bar alone is what the frame uses to
  // separate the three windows; there are no inner cards.
  const windows = [
    { key: 'full', bar: 'bg-success', text: 'text-success' },
    { key: 'half', bar: 'bg-[#f5c64d]', text: 'text-[#f5c64d]' },
    { key: 'none', bar: 'bg-destructive', text: 'text-destructive' },
  ] as const;

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-[#242424] p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium text-foreground lg:font-normal">{t('title')}</h2>
        <p className="text-tiny text-muted-foreground">{t('description')}</p>
      </div>

      {/* The colour bar turns: a vertical rule down the left of each row on a phone, a horizontal
          rule across the top of each column from `sm`. Same three windows, two orientations. */}
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {windows.map((window) => (
          <div key={window.key} className="flex gap-3 sm:flex-col sm:gap-2">
            <span
              aria-hidden="true"
              className={cn('w-[3px] shrink-0 rounded-[3px] sm:h-[3px] sm:w-full', window.bar)}
            />
            <div className="flex flex-col gap-1 sm:gap-2">
              <span className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {t(`windows.${window.key}.when`)}
              </span>
              <span className={cn('text-base', window.text)}>
                {t(`windows.${window.key}.refund`)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-px bg-[#2a2a2a]" />

      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li className="text-tiny text-muted-foreground">{t('rules.cancel')}</li>
        <li className="text-tiny text-muted-foreground">{t('rules.reschedule')}</li>
      </ul>
    </section>
  );
}

/**
 * Cabinet → Sessions Setup (Figma `1094:23946` desktop / `1091:10460` mobile).
 *
 * Replaces the wizard's "Personal session" step, deleted 2026-08-13 — this is now the only place
 * 1:1 settings are configured. Two model changes came with it (migration `20260813113351`):
 * several enabled durations instead of one, and per-day time windows instead of a single
 * from/to for the whole week.
 *
 * Everything below the "Accepting bookings" toggle hides when it is off, same as the wizard did:
 * a profile that isn't taking bookings has nothing to price or schedule.
 */
export function SessionsSetupForm({ topicOptions, initialSettings }: SessionsSetupFormProps) {
  const t = useTranslations('dashboard.sessions');
  const tCabinet = useTranslations('dashboard.profile');
  const tOnboarding = useTranslations('mindsetterOnboarding');
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultValues: SessionStepInput = {
    acceptsBookings: initialSettings?.acceptsBookings ?? true,
    sessionType: initialSettings?.sessionType ?? 'free',
    priceCents: initialSettings?.priceCents ?? null,
    durations: (initialSettings?.durations?.length
      ? initialSettings.durations
      : [30]) as SessionStepInput['durations'],
    topics: initialSettings?.topics ?? [],
    timezone: initialSettings?.timezone ?? '',
    weeklyAvailability: initialSettings?.weeklyAvailability ?? emptyWeeklyAvailability(),
    feeConsentAccepted: initialSettings?.feeConsentAccepted ?? false,
  };

  const form = useForm<SessionStepInput>({
    resolver: zodResolver(sessionStepSchema),
    mode: 'onChange',
    defaultValues,
  });

  const acceptsBookings = useWatch({ control: form.control, name: 'acceptsBookings' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveSessionSettings(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }
    // Rebase so a later Cancel reverts to what was just saved, matching the profile editors.
    form.reset(values);
    notifySaved();
  });

  return (
    <Form {...form}>
      {/* 12px between cards on a phone, 20px from `lg` (2026-08-13 request). */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 lg:gap-5">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <SettingsCard title={t('accepting.title')} description={t('accepting.description')}>
          <FormField
            control={form.control}
            name="acceptsBookings"
            render={({ field }) => (
              <FormItem>
                {/* Label left / switch pushed to the right edge on a phone; switch first, label
                    beside it from `lg` — the two frames put them in opposite orders. */}
                <div className="flex flex-row-reverse items-center justify-between gap-3 lg:flex-row lg:justify-start">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={t('accepting.toggle')}
                  />
                  <span className="text-base text-foreground">{t('accepting.toggle')}</span>
                </div>
              </FormItem>
            )}
          />
        </SettingsCard>

        {acceptsBookings ? (
          <>
            <SettingsCard title={t('price.title')} description={t('price.description')}>
              <PriceSection control={form.control} />

              {/* Bordered box with its own icon and heading, not a plain tinted strip. */}
              <div className="flex gap-3 rounded-xl border border-[#2a2a2a] p-4">
                <PayoutGuaranteeIcon className="mt-0.5 size-[19px] shrink-0 text-success" />
                <div className="flex flex-col gap-1">
                  <span className="text-base text-foreground">{t('price.payoutTitle')}</span>
                  <p className="text-tiny text-muted-foreground">{t('price.payoutGuarantee')}</p>
                  {/* "Earnings" is styled as the link the frame shows but is NOT one yet — that
                      page doesn't exist (it's still a "coming soon" row in the sidebar), so a real
                      href would 404. */}
                  <p className="text-tiny text-muted-foreground">
                    {t.rich('price.payoutAccount', {
                      earnings: (chunks) => <span className="text-primary">{chunks}</span>,
                    })}
                  </p>
                </div>
              </div>

              <DurationsField control={form.control} />
            </SettingsCard>

            <SettingsCard title={t('topics.title')} description={t('topics.description')}>
              <TopicsField control={form.control} options={topicOptions} />
            </SettingsCard>

            <SettingsCard
              title={t('availability.title')}
              description={t('availability.description')}
            >
              <TimezoneField control={form.control} />
              <WeeklyAvailabilityField control={form.control} />
            </SettingsCard>

            <CancellationPolicyCard />
          </>
        ) : null}

        {/* Save first on desktop, Cancel first on mobile — the frames swap them. */}
        <div className="flex flex-row gap-3 pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={form.formState.isSubmitting}
            className="order-2 h-[52px] flex-1 px-4 lg:order-1 lg:h-14 lg:flex-none lg:px-8"
          >
            {form.formState.isSubmitting ? tOnboarding('common.saving') : tCabinet('saveChanges')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={form.formState.isSubmitting}
            onClick={() => {
              form.reset();
              setFormError(null);
            }}
            className="order-1 h-[52px] flex-1 px-4 lg:order-2 lg:h-14 lg:flex-none lg:px-8"
          >
            {tCabinet('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
