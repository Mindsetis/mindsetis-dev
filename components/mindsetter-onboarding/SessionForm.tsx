'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  type Control,
  useController,
  useForm,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import { saveSession } from '@/app/[locale]/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import {
  ShineOptionCheckedIcon,
  ShineOptionUncheckedIcon,
} from '@/components/icons/shine-block-icons';
import { PlatformFeeModal } from '@/components/mindsetter-onboarding/PlatformFeeModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
  feeConsentAccepted: boolean;
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

/** "UTC+3"-style short offset for a zone (no "currently …" clock) — the LIST secondary line and
 * a lighter building block than `formatTimezoneOffset`. Best-effort: swallows `Intl` failures. */
function formatTimezoneShortOffset(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return (parts.find((part) => part.type === 'timeZoneName')?.value ?? '').replace('GMT', 'UTC');
  } catch {
    return '';
  }
}

/** Globe icon (32×32) for the timezone trigger's leading slot — provided verbatim by the
 * designer, hardcoded white stroke. */
function TimezoneGlobeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5 16C5 22.0752 9.92468 26.9999 16 26.9999C22.0752 26.9999 26.9999 22.0752 26.9999 16C26.9999 9.92468 22.0752 5 16 5C9.92468 5 5 9.92468 5 16Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.1003 5.05469C17.1003 5.05469 20.4003 9.39967 20.4003 15.9996C20.4003 22.5996 17.1003 26.9446 17.1003 26.9446M14.9003 26.9446C14.9003 26.9446 11.6003 22.5996 11.6003 15.9996C11.6003 9.39967 14.9003 5.05469 14.9003 5.05469M5.69336 19.8496H26.3073M5.69336 12.1497H26.3073"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trailing chevron (24×24, `#A5A5A5`) for the timezone trigger — provided verbatim by the
 * designer, replacing the shared combobox's default check-circle/chevron for this field. */
function TimezoneChevronIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.20039 7.1002C8.80039 7.5002 8.80039 8.1002 9.20039 8.5002L12.7004 12.0002L9.20039 15.5002C8.80039 15.9002 8.80039 16.5002 9.20039 16.9002C9.60039 17.3002 10.2004 17.3002 10.6004 16.9002L14.8004 12.7002C15.0004 12.5002 15.1004 12.3002 15.1004 12.0002C15.1004 11.7002 15.0004 11.5002 14.8004 11.3002L10.6004 7.1002C10.2004 6.7002 9.60039 6.7002 9.20039 7.1002Z"
        fill="#A5A5A5"
      />
    </svg>
  );
}

/** Trailing chevron (24×24, white) for the "Platform fee & payouts" row — provided verbatim by
 * the designer, replacing `lucide-react`'s `ChevronRight`. */
function HowItWorksChevronIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.19844 7.1002C8.79844 7.5002 8.79844 8.1002 9.19844 8.5002L12.6984 12.0002L9.19844 15.5002C8.79844 15.9002 8.79844 16.5002 9.19844 16.9002C9.59844 17.3002 10.1984 17.3002 10.5984 16.9002L14.7984 12.7002C14.9984 12.5002 15.0984 12.3002 15.0984 12.0002C15.0984 11.7002 14.9984 11.5002 14.7984 11.3002L10.5984 7.1002C10.1984 6.7002 9.59844 6.7002 9.19844 7.1002Z"
        fill="white"
      />
    </svg>
  );
}

/** "+ Add custom" icon (16×16, white) for the topics field — provided verbatim by the designer,
 * replacing the literal "+ " text prefix. */
function AddCustomTopicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.33398 7.33301V3.99967C7.33398 3.63148 7.63246 3.33301 8.00065 3.33301C8.36884 3.33301 8.66732 3.63148 8.66732 3.99967V7.33301H12.0007C12.3688 7.33301 12.6673 7.63148 12.6673 7.99967C12.6673 8.36786 12.3688 8.66634 12.0007 8.66634H8.66732V11.9997C8.66732 12.3679 8.36884 12.6663 8.00065 12.6663C7.63246 12.6663 7.33398 12.3679 7.33398 11.9997V8.66634H4.00065C3.63246 8.66634 3.33398 8.36786 3.33398 7.99967C3.33398 7.63148 3.63246 7.33301 4.00065 7.33301H7.33398Z"
        fill="white"
      />
    </svg>
  );
}

/** Selected-topic check icon (16×16) — same verbatim path as `Chip`'s own `ChipCheckIcon`
 * (Figma "checkbox-circle-fill"), duplicated locally since the topics field renders its own
 * chip markup (not the shared `Chip` component) to move this icon to the LEFT of the label and
 * apply this field's own bespoke colors/background, per the 2026-07-19 follow-up. */
function TopicCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.9987 14.6666C11.6806 14.6666 14.6654 11.6818 14.6654 7.99998C14.6654 4.31808 11.6806 1.33331 7.9987 1.33331C4.3168 1.33331 1.33203 4.31808 1.33203 7.99998C1.33203 11.6818 4.3168 14.6666 7.9987 14.6666ZM11.1654 5.83332C11.4257 6.09367 11.4257 6.51577 11.1654 6.77612L8.03914 9.90234C7.64861 10.2929 7.01545 10.2929 6.62492 9.90234L4.9987 8.27612C4.73835 8.01577 4.73835 7.59366 4.9987 7.33331C5.25905 7.07296 5.68116 7.07297 5.9415 7.33331L7.33203 8.72385L10.2226 5.83331C10.4829 5.57296 10.905 5.57296 11.1654 5.83332Z"
        fill="#79B9E3"
      />
    </svg>
  );
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
 * "Your timezone" field (onboarding doc section 5). Auto-detects via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` on mount (client-only, hence a real
 * component rather than an inline `Controller` render-prop, so the `useEffect`/`useController`
 * hooks are legal), but the value is now editable — the detected zone is just the default, and
 * the caller can pick any IANA zone from the searchable `Combobox` (2026-07-19 follow-up:
 * previously a read-only card). A caller revisiting this step keeps their previously-saved value
 * instead of re-detecting.
 */
function TimezoneField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');
  const { field } = useController({ control, name: 'timezone' });

  // Every IANA zone, built once (the list never changes at runtime). `Intl.supportedValuesOf`
  // is widely supported but guarded anyway — an empty list just yields an empty picker, no throw.
  const baseZones = useMemo<ComboboxOption[]>(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch {
      zones = [];
    }
    return zones.map((zone) => ({
      value: zone,
      label: formatTimezoneName(zone),
      description: formatTimezoneShortOffset(zone),
    }));
  }, []);

  // Force-include the caller's own saved/detected zone if `Intl.supportedValuesOf` omitted it (or
  // was unavailable), so the combobox can always render it as the selected label.
  const timezoneOptions = useMemo<ComboboxOption[]>(() => {
    if (field.value && !baseZones.some((option) => option.value === field.value)) {
      return [
        {
          value: field.value,
          label: formatTimezoneName(field.value),
          description: formatTimezoneShortOffset(field.value),
        },
        ...baseZones,
      ];
    }
    return baseZones;
  }, [baseZones, field.value]);

  useEffect(() => {
    if (field.value) return;
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) field.onChange(detected);
    } catch {
      // Intl unsupported in this environment — leave blank; the schema's "Timezone is
      // required." message surfaces via FormMessage if the caller tries to submit.
    }
    // Only ever run once on mount — auto-detect is a default, not something to re-apply over a
    // caller's own later pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const offsetReadout = field.value ? formatTimezoneOffset(field.value) : '';

  return (
    <div className="flex flex-col gap-2">
      <p className={cn(labelVariants({ variant: 'boldSpacing' }), 'mb-1 text-[#a5a5a5]')}>
        {t('session.timezoneLabel')}
      </p>
      <Combobox
        value={field.value ?? ''}
        onChange={field.onChange}
        options={timezoneOptions}
        searchable
        placeholder={t('session.timezonePlaceholder')}
        searchPlaceholder={t('session.timezoneSearchPlaceholder')}
        emptyLabel={t('session.timezoneEmpty')}
        leftIcon={<TimezoneGlobeIcon />}
        triggerDescription={offsetReadout || undefined}
        trailingIcon={<TimezoneChevronIcon />}
      />
      <FieldHint>{t('session.timezoneHint')}</FieldHint>
    </div>
  );
}

/** Currency price input rendered INSIDE the Paid card, always visible (2026-07-19 follow-up —
 * previously a separate field below the cards, then briefly gated on Paid being selected; now
 * shown immediately so the caller sees where the price goes). Stores cents in RHF (`priceCents`)
 * but shows/accepts whole/decimal currency units in the field. Its own `FormField` (nested under
 * `PriceSection`'s `sessionType` field) — a different field name, so no double-registration. */
function PriceInput({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');

  return (
    <FormField
      control={control}
      name="priceCents"
      render={({ field }) => (
        <FormItem>
          {/* `FormControl` (Radix `Slot`) must wrap the `Input` DIRECTLY, not the flex `div` — it
              merges a non-DOM `valid` prop onto its child, and only `Input`/`Textarea`/`Select`
              consume it; on a plain `div` it would leak as an invalid `valid` DOM attribute (React
              "non-boolean attribute" warning). The `$` prefix + row layout live OUTSIDE it. */}
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="shrink-0 font-display text-[32px] leading-none font-normal text-white"
            >
              $
            </span>
            <FormControl>
              <Input
                type="number"
                min={1}
                step="1"
                inputMode="decimal"
                placeholder={t('session.priceInputPlaceholder')}
                className="h-10 rounded-[8px] py-2"
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
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** "Indicate session price" — Free/Paid radio cards. Single `FormField` for `sessionType`
 * (two separate `FormField`s bound to the same field name would double-register it with RHF).
 * The Paid card is a container `<div>` (not a `<button>`) so the price `Input` can nest inside it
 * — nesting interactive content in a `<button>` is invalid HTML; the header row stays the
 * `role="radio"` selectable element, the price input sits below it. */
function PriceSection({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('mindsetterOnboarding');

  return (
    <FormField
      control={control}
      name="sessionType"
      render={({ field }) => (
        <FormItem>
          <FormLabel variant="boldSpacing" className="mb-2 text-[#a5a5a5]">
            {t('session.priceLabel')}
          </FormLabel>
          <div
            role="radiogroup"
            aria-label={t('session.priceLabel')}
            className="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={field.value === 'free'}
              onClick={() => field.onChange('free')}
              className="flex min-h-[158px] cursor-pointer flex-col items-start gap-2 rounded-[16px] border border-border bg-card p-6 text-left transition-colors hover:border-foreground"
            >
              {field.value === 'free' ? <ShineOptionCheckedIcon /> : <ShineOptionUncheckedIcon />}
              <span className="text-base font-bold text-[#79b9e3]">{t('session.free.label')}</span>
              <span className="font-display text-[32px] leading-none font-normal text-white">
                {t('session.free.value')}
              </span>
            </button>
            <div className="flex min-h-[158px] cursor-pointer flex-col gap-2 rounded-[16px] border border-border bg-card p-6 transition-colors hover:border-foreground">
              <button
                type="button"
                role="radio"
                aria-checked={field.value === 'paid'}
                onClick={() => field.onChange('paid')}
                className="flex cursor-pointer flex-col items-start gap-2 text-left"
              >
                {field.value === 'paid' ? <ShineOptionCheckedIcon /> : <ShineOptionUncheckedIcon />}
                <span className="text-base font-bold text-[#79b9e3]">
                  {t('session.paid.label')}
                </span>
              </button>
              <PriceInput control={control} />
            </div>
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
          <FormLabel variant="boldSpacing" className="mb-2 text-[#a5a5a5]">
            {t('session.durationLabel')}
          </FormLabel>
          <div className="flex gap-2">
            {SESSION_DURATIONS.map((minutes) => (
              <Chip
                key={minutes}
                selected={field.value === minutes}
                onClick={() => field.onChange(minutes)}
                className={cn(
                  'h-auto grow shrink basis-0 justify-center rounded-[12px] p-4 text-base font-medium text-white',
                  field.value === minutes &&
                    'border-transparent bg-[#79b9e3] text-black hover:border-transparent',
                )}
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
            <FormLabel variant="boldSpacing" className="mb-2 text-[#a5a5a5]">
              {t('session.topicsLabel', { max: MAX_SESSION_TOPICS })}
            </FormLabel>
            <div className="flex flex-wrap gap-2">
              {displayOptions.map((topic) => {
                const isSelected = selected.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!isSelected && atMax}
                    onClick={() => toggle(topic)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-[12px] border border-border bg-[#1a1a1a] px-3 py-4 text-base font-medium whitespace-nowrap text-white transition-colors',
                      'hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60',
                      isSelected && 'border-[#79b9e3] text-[#79b9e3] hover:border-[#79b9e3]',
                    )}
                  >
                    {isSelected ? <TopicCheckIcon /> : null}
                    {topic}
                  </button>
                );
              })}
              {!showCustomInput ? (
                <button
                  type="button"
                  disabled={atMax}
                  onClick={() => setShowCustomInput(true)}
                  className="inline-flex items-center gap-1 rounded-[12px] border border-border px-3 py-4 text-base font-medium whitespace-nowrap text-white transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AddCustomTopicIcon />
                  {t('session.addCustomTopic')}
                </button>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-14"
                  onClick={addCustom}
                >
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
            <FormLabel variant="boldSpacing" className="mb-2 text-[#a5a5a5]">
              {t('session.availableDaysLabel')}
            </FormLabel>
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => (
                <Chip
                  key={day}
                  selected={selected.includes(day)}
                  onClick={() => toggle(day)}
                  className="h-16 w-16 shrink-0 bg-[#1a1a1a] px-0 text-base font-medium"
                >
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
 * Extended Mindsetter onboarding — step 5/5 (now the LAST core step, product decision D9)
 * "Personal session" form (see `page.tsx`). Maps to
 * `session_settings` (mindsetter_id primary key) rather than `mindsetter_profiles`, unlike the
 * three earlier steps. Mirrors the RHF + `zodResolver` + `applyFieldErrors` structure every
 * other onboarding step form uses.
 */
export function SessionForm({ topicOptions, initialSessionSettings }: SessionFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  // How the fee modal was opened, which decides what "I agree — continue setup" does:
  // - `'gate'`  → opened by "Save and continue" as the consent gate; agreeing submits + advances.
  // - `'info'`  → opened by the informational "Platform fee & payouts" button; agreeing just
  //               records consent and closes, it must NOT jump the caller to the next step.
  // State (not a ref) so React's ref-in-render lint stays happy — each setter also re-renders,
  // so `handleFeeAgree` below always closes over the mode that was set when the modal opened.
  const [feeModalMode, setFeeModalMode] = useState<'gate' | 'info'>('info');

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
      // Platform-fee consent, seeded from what's already persisted in `session_settings` — so a
      // returning Mindsetter who agreed before isn't re-prompted by the gate below. Not a rendered
      // input; driven by `PlatformFeeModal` via `handleFeeAgree` and saved back by `saveSession`.
      feeConsentAccepted: initialSessionSettings?.feeConsentAccepted ?? false,
    },
  });

  const acceptsBookings = useWatch({ control: form.control, name: 'acceptsBookings' });

  // The real persistence step, gate-free: validate-passing values → save → advance to congrats.
  // Called from BOTH the normal submit path and the fee-modal's "I agree" path (which bypasses
  // the consent gate, since agreeing IS the consent).
  async function persist(values: SessionStepInput) {
    setFormError(null);

    const result = await saveSession(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Last core step — Personal session now flows straight to congrats (product decision D9
    // moved it to the last core step, after the "Shine" picker and any optional blocks).
    router.push('/mindsetter-onboarding/congrats');
  }

  const onSubmit = form.handleSubmit(async (values) => {
    // Consent gate: an accepting-bookings profile must accept the platform-fee policy before it
    // can be saved. First "Save and continue" opens the fee modal instead of proceeding; the
    // modal's "I agree — continue setup" then runs `persist` (see `handleFeeAgree`). Once consent
    // is given (this session OR loaded from a prior save via `feeConsentAccepted`), later saves
    // proceed straight through.
    if (acceptsBookings && !values.feeConsentAccepted) {
      setFeeModalMode('gate');
      setFeeModalOpen(true);
      return;
    }

    await persist(values);
  });

  // Fee-modal "I agree — continue setup": always record consent and close. Only when the modal
  // was opened as the "Save and continue" gate (`'gate'`) do we then run the real submit through
  // `persist` (via `handleSubmit` so validation still applies) — opening it from the purely
  // informational "Platform fee & payouts" button (`'info'`) records consent but must not advance
  // the caller to the next step.
  async function handleFeeAgree() {
    const wasGate = feeModalMode === 'gate';
    // Record consent into the form value (persisted by `saveSession` → `fee_consent_accepted`),
    // shouldValidate so the gate's `values.feeConsentAccepted` is fresh for the submit below.
    form.setValue('feeConsentAccepted', true, { shouldValidate: true });
    setFeeModalOpen(false);
    if (wasGate) {
      await form.handleSubmit(persist)();
    }
  }

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
              <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-transparent p-4">
                <div className="flex flex-col gap-0">
                  <span className="text-[22px] font-bold text-foreground">
                    {t('session.acceptBookings.title')}
                  </span>
                  <span className="text-tiny text-muted-foreground">
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

            <div className="flex flex-col gap-3">
              <p className={cn(labelVariants({ variant: 'boldSpacing' }), 'text-[#a5a5a5]')}>
                {t('session.howItWorks.label')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFeeModalMode('info');
                  setFeeModalOpen(true);
                }}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-[8px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-[#79b9e3]">
                    {t('session.howItWorks.title')}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {t.rich('session.howItWorks.subtitle', {
                      br: () => <br className="md:hidden" />,
                    })}
                  </span>
                </div>
                <span className="shrink-0">
                  <HowItWorksChevronIcon />
                </span>
              </button>
            </div>
            <PlatformFeeModal
              open={feeModalOpen}
              onOpenChange={setFeeModalOpen}
              onAgree={handleFeeAgree}
            />

            <DurationField control={form.control} />

            <TopicsField control={form.control} options={topicOptions} />

            <TimezoneField control={form.control} />

            <AvailableDaysField control={form.control} />

            <div className="flex flex-col gap-2">
              <p className={cn(labelVariants({ variant: 'boldSpacing' }), 'mb-1 text-[#a5a5a5]')}>
                {t('session.availableHoursLabel')}
              </p>
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="availableFrom"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium text-white">
                          {t('session.availableFromLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            onClick={(event) => event.currentTarget.showPicker?.()}
                            className="w-[120px] cursor-pointer justify-center text-center [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:text-center focus-visible:border-[#79b9e3] focus-visible:text-[#79b9e3]"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="shrink-0 text-muted-foreground">—</span>
                <FormField
                  control={form.control}
                  name="availableTo"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium text-white">
                          {t('session.availableToLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            onClick={(event) => event.currentTarget.showPicker?.()}
                            className="w-[120px] cursor-pointer justify-center text-center [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:text-center focus-visible:border-[#79b9e3] focus-visible:text-[#79b9e3]"
                            {...field}
                          />
                        </FormControl>
                      </div>
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
