'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  type Control,
  useController,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveSession } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { PlatformFeeModal } from '@/components/mindsetter-onboarding/PlatformFeeModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { FieldHint } from '@/components/ui/field-hint';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { labelVariants } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  MAX_SESSION_TOPICS,
  MAX_TOPIC_LENGTH,
  SESSION_DURATIONS,
  type SessionDuration,
  type SessionStepInput,
  sessionStepSchema,
  type Weekday,
  WEEKDAYS,
} from '@/lib/validation/mindsetter';

type SessionSettingsInitial = {
  acceptsBookings: boolean;
  sessionType: 'free' | 'paid';
  priceCents: number | null;
  durationMin: number;
  topics: string[];
  timezone: string;
  availableDays: string[];
  availableFrom: string;
  availableTo: string;
};

type SessionFormProps = {
  /**
   * `mindsetter_profiles.help_with` card titles — the option source for "Topics you're expert
   * in" (onboarding doc section E.1: these titles feed this step, "+ Add custom" adds an
   * ad-hoc topic to this list only, never written back to `help_with`).
   */
  topicOptions: string[];
  /** Already-saved `session_settings` row, when the caller revisits this step. */
  initialSessionSettings?: SessionSettingsInitial;
};

const DEFAULT_AVAILABLE_FROM = '10:00';
const DEFAULT_AVAILABLE_TO = '18:00';

/** "Europe/Kyiv" -> "Europe / Kyiv" — cosmetic only, no locale data involved. */
function formatTimezoneName(timezone: string): string {
  return timezone.replace(/_/g, ' ').replace(/\//g, ' / ');
}

/** "GMT+3 · currently 14:30"-style live readout for the detected IANA timezone. Best-effort:
 * swallows `Intl` failures (e.g. an invalid/unsupported zone string) and just renders nothing
 * rather than throwing during render. */
function formatTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const offsetParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const offset = (offsetParts.find((part) => part.type === 'timeZoneName')?.value ?? '').replace(
      'GMT',
      'UTC',
    );
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    return offset ? `${offset} · currently ${time}` : '';
  } catch {
    return '';
  }
}

/**
 * "Your timezone" card (onboarding doc section 5). Per this stage's build prompt, a full
 * timezone picker is out of MVP scope — this auto-detects via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` on mount (client-only, hence a real
 * component rather than an inline `Controller` render-prop, so the `useEffect`/`useController`
 * hooks are legal) and just stores whatever it detects; a caller revisiting this step keeps
 * their previously-saved value instead of re-detecting.
 */
function TimezoneField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');
  const { field } = useController({ control, name: 'timezone' });

  useEffect(() => {
    if (field.value) return;
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) field.onChange(detected);
    } catch {
      // Intl unsupported in this environment — leave blank; the schema's "Timezone is
      // required." message surfaces via FormMessage if the caller tries to submit.
    }
    // Only ever run once on mount — re-running on every `field` identity change would fight a
    // caller's own later edits (not applicable yet since this field has no manual editor, but
    // keeps this effect's intent unambiguous if one is added later).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className={labelVariants()}>{t('session.timezoneLabel')}</p>
      <div className="rounded-[16px] border border-border bg-card p-4">
        {field.value ? (
          <>
            <p className="text-base font-bold text-foreground">{formatTimezoneName(field.value)}</p>
            <p className="text-sm text-muted-foreground">{formatTimezoneOffset(field.value)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('session.timezoneDetecting')}</p>
        )}
      </div>
      <FieldHint>{t('session.timezoneHint')}</FieldHint>
    </div>
  );
}

/** "Indicate session price" — Free/Paid radio cards. Single `FormField` for `sessionType`
 * (two separate `FormField`s bound to the same field name would double-register it with RHF). */
function PriceSection({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');

  return (
    <FormField
      control={control}
      name="sessionType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('session.priceLabel')}</FormLabel>
          <div
            role="radiogroup"
            aria-label={t('session.priceLabel')}
            className="grid grid-cols-2 gap-3"
          >
            <button
              type="button"
              role="radio"
              aria-checked={field.value === 'free'}
              onClick={() => field.onChange('free')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-[16px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground',
                field.value === 'free' && 'border-primary hover:border-primary',
              )}
            >
              <span className="text-base font-bold text-foreground">{t('session.free.label')}</span>
              <span className="text-sm text-muted-foreground">{t('session.free.value')}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={field.value === 'paid'}
              onClick={() => field.onChange('paid')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-[16px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground',
                field.value === 'paid' && 'border-primary hover:border-primary',
              )}
            >
              <span className="text-base font-bold text-foreground">{t('session.paid.label')}</span>
              <span className="text-sm text-muted-foreground">{t('session.paid.hint')}</span>
            </button>
          </div>
          <FieldHint>{t('session.priceHint')}</FieldHint>
        </FormItem>
      )}
    />
  );
}

/** "Choose session's duration" — fixed 30/45/60/90 pills, single-select. Plain `Chip` toggle
 * buttons (no `role="radio"`/`aria-checked` override) — same convention `InterestsPicker`
 * already uses for its category-filter row, so this reads through `Chip`'s own `aria-pressed`
 * rather than mixing two different ARIA toggle patterns on one element. */
function DurationField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');

  return (
    <FormField
      control={control}
      name="durationMin"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('session.durationLabel')}</FormLabel>
          <div className="flex flex-wrap gap-2">
            {SESSION_DURATIONS.map((minutes) => (
              <Chip
                key={minutes}
                selected={field.value === minutes}
                onClick={() => field.onChange(minutes)}
              >
                {t('session.durationOption', { minutes })}
              </Chip>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** "Topics you're expert in · up to 5" — multiselect chips sourced from `options` (the
 * "You can help with" card titles), plus a "+ Add custom" affordance. A custom entry is just
 * pushed straight into the `topics` field value (no separate local list) — the displayed chip
 * set is `options` unioned with whatever's currently selected, so an already-picked custom
 * topic keeps rendering as a chip on re-render/revisit without needing its own state. */
function TopicsField({
  control,
  options,
}: {
  control: Control<SessionStepInput>;
  options: string[];
}) {
  const t = useTranslations('mindsetterOnboarding');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  return (
    <FormField
      control={control}
      name="topics"
      render={({ field }) => {
        const selected: string[] = field.value ?? [];
        const displayOptions = Array.from(new Set([...options, ...selected]));
        const atMax = selected.length >= MAX_SESSION_TOPICS;

        function toggle(topic: string) {
          if (selected.includes(topic)) {
            field.onChange(selected.filter((item) => item !== topic));
            return;
          }
          if (atMax) return;
          field.onChange([...selected, topic]);
        }

        function addCustom() {
          const trimmed = customInput.trim();
          if (!trimmed || atMax || selected.includes(trimmed)) return;
          field.onChange([...selected, trimmed]);
          setCustomInput('');
          setShowCustomInput(false);
        }

        return (
          <FormItem>
            <FormLabel>{t('session.topicsLabel', { max: MAX_SESSION_TOPICS })}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {displayOptions.map((topic) => {
                const isSelected = selected.includes(topic);
                return (
                  <Chip
                    key={topic}
                    selected={isSelected}
                    showCheck
                    disabled={!isSelected && atMax}
                    onClick={() => toggle(topic)}
                  >
                    {topic}
                  </Chip>
                );
              })}
              {!showCustomInput ? (
                <Chip type="button" disabled={atMax} onClick={() => setShowCustomInput(true)}>
                  + {t('session.addCustomTopic')}
                </Chip>
              ) : null}
            </div>
            {showCustomInput ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  autoFocus
                  maxLength={MAX_TOPIC_LENGTH}
                  value={customInput}
                  onChange={(event) => setCustomInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder={t('session.addCustomTopicPlaceholder')}
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustom}>
                  {t('session.addCustomTopicConfirm')}
                </Button>
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/** "Available days" — 7 Mo–Su toggle pills, multi-select. Same `Chip`-toggle convention as
 * `DurationField`/`InterestsPicker`. */
function AvailableDaysField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');

  return (
    <FormField
      control={control}
      name="availableDays"
      render={({ field }) => {
        const selected: Weekday[] = field.value ?? [];

        function toggle(day: Weekday) {
          field.onChange(
            selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day],
          );
        }

        return (
          <FormItem>
            <FormLabel>{t('session.availableDaysLabel')}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Chip key={day} selected={selected.includes(day)} onClick={() => toggle(day)}>
                  {t(`session.weekday.${day}`)}
                </Chip>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Extended Mindsetter onboarding — step 4/5 "Personal session" form (see `page.tsx`). Maps to
 * `session_settings` (mindsetter_id primary key) rather than `mindsetter_profiles`, unlike the
 * three earlier steps. Mirrors the RHF + `zodResolver` + `applyFieldErrors` structure every
 * other onboarding step form uses.
 */
export function SessionForm({ topicOptions, initialSessionSettings }: SessionFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);

  const form: UseFormReturn<SessionStepInput> = useForm<SessionStepInput>({
    resolver: zodResolver(sessionStepSchema),
    mode: 'onChange',
    defaultValues: {
      acceptsBookings: initialSessionSettings?.acceptsBookings ?? true,
      sessionType: initialSessionSettings?.sessionType ?? 'free',
      priceCents: initialSessionSettings?.priceCents ?? null,
      durationMin: (initialSessionSettings?.durationMin ?? 30) as SessionDuration,
      topics: initialSessionSettings?.topics ?? [],
      timezone: initialSessionSettings?.timezone ?? '',
      availableDays: (initialSessionSettings?.availableDays ?? []) as Weekday[],
      availableFrom: initialSessionSettings?.availableFrom ?? DEFAULT_AVAILABLE_FROM,
      availableTo: initialSessionSettings?.availableTo ?? DEFAULT_AVAILABLE_TO,
    },
  });

  const acceptsBookings = useWatch({ control: form.control, name: 'acceptsBookings' });
  const sessionType = useWatch({ control: form.control, name: 'sessionType' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveSession(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Step 5/5 — "Make your profile shine."
    router.push('/mindsetter-onboarding/shine');
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="acceptsBookings"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-bold text-foreground">
                    {t('session.acceptBookings.title')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('session.acceptBookings.subtitle')}
                  </span>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            </FormItem>
          )}
        />

        {acceptsBookings ? (
          <>
            <PriceSection control={form.control} />

            {sessionType === 'paid' ? (
              <FormField
                control={form.control}
                name="priceCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('session.priceInputLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        inputMode="decimal"
                        placeholder={t('session.priceInputPlaceholder')}
                        value={field.value == null ? '' : field.value / 100}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === '') {
                            field.onChange(null);
                            return;
                          }
                          const dollars = Number(raw);
                          field.onChange(Number.isNaN(dollars) ? null : Math.round(dollars * 100));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <button
              type="button"
              onClick={() => setFeeModalOpen(true)}
              className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-foreground">
                  {t('session.howItWorks.title')}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('session.howItWorks.subtitle')}
                </span>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
            <PlatformFeeModal
              open={feeModalOpen}
              onOpenChange={setFeeModalOpen}
              onAgree={() => setFeeModalOpen(false)}
            />

            <DurationField control={form.control} />

            <TopicsField control={form.control} options={topicOptions} />

            <TimezoneField control={form.control} />

            <AvailableDaysField control={form.control} />

            <div className="flex flex-col gap-2">
              <p className={labelVariants()}>{t('session.availableHoursLabel')}</p>
              <div className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name="availableFrom"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t('session.availableFromLabel')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availableTo"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t('session.availableToLabel')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        ) : null}

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
