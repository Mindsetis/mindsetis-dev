'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { arrayErrorMessage } from '@/components/ui/form-errors';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { cn } from '@/lib/utils';
import {
  MAX_RANGES_PER_DAY,
  type SessionStepInput,
  type TimeRange,
  type Weekday,
  WEEKDAYS,
} from '@/lib/validation/mindsetter';

/**
 * Every half hour of the day, as "HH:mm". The frame draws these as dropdowns with a chevron
 * rather than free text or a native time input, so the choices are a fixed grid — which also
 * removes a whole class of nonsense input (03:07 starts) without needing extra validation.
 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});

const DEFAULT_RANGE: TimeRange = { from: '09:00', to: '18:00' };

/**
 * The window "Add range" appends: one hour starting where the day's latest window ends (touching
 * windows are allowed), so the new row doesn't open already red with an overlap error. Falls
 * back to the default only when the day has no room left after its last window.
 */
function nextRange(ranges: TimeRange[]): TimeRange {
  if (ranges.length === 0) return DEFAULT_RANGE;
  const latestEnd = ranges.reduce((latest, range) => (range.to > latest ? range.to : latest), '');
  const start = TIME_OPTIONS.indexOf(latestEnd);
  const end = TIME_OPTIONS[start + 2] ?? TIME_OPTIONS[start + 1];
  return start >= 0 && end ? { from: latestEnd, to: end } : DEFAULT_RANGE;
}

/** What RHF keeps under `errors.weeklyAvailability`: the schema reports a bad window at its own
 * path (`mon.0.to` for "ends before it starts", `mon.1.from` for an overlap), so the error is a
 * tree, not a message. */
type AvailabilityErrors = Partial<
  Record<Weekday, Array<{ from?: { message?: string }; to?: { message?: string } } | undefined>>
>;

function TimeSelect({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="h-12 w-[110px] rounded-xl bg-[#242424]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * "AVAILABLE DAYS" — the seven-row weekly schedule (Figma `1094:23946`, card "Weekly
 * availability").
 *
 * Each row is a toggle plus that day's own windows. Turning a day ON gives it one 09:00–18:00
 * window so the row is never enabled-but-empty; turning it OFF clears the windows rather than
 * remembering them, which keeps the stored shape and what's on screen the same thing — the column
 * treats "no ranges" as "unavailable", so a hidden remembered range would be a lie.
 *
 * The old onboarding step had ONE from/to pair for the whole week; this is the per-day, multi-range
 * model that replaced it in migration `20260813113351`.
 */
export function WeeklyAvailabilityField({ control }: { control: Control<SessionStepInput> }) {
  const t = useTranslations('dashboard.sessions.availability');
  const tSession = useTranslations('mindsetterOnboarding.session');
  const { field, fieldState } = useController({ control, name: 'weeklyAvailability' });
  // `availabilityRequired` arrives as an encoded key reference, not a sentence — this field
  // renders its own error rather than going through components/ui/form.tsx, so it decodes here.
  const tValidation = useValidationMessage();

  const availability = field.value;
  const rangeErrors = fieldState.error as unknown as AvailabilityErrors | undefined;

  function setRanges(day: Weekday, ranges: TimeRange[]) {
    field.onChange({ ...availability, [day]: ranges });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
        {t('daysLabel')}
      </p>

      <div className="flex flex-col gap-5">
        {WEEKDAYS.map((day) => {
          const ranges = availability[day];
          const enabled = ranges.length > 0;
          // The day-level rule (more windows than allowed) lands on the day's array itself.
          const dayError = arrayErrorMessage(rangeErrors?.[day]);

          return (
            <div key={day} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex w-full items-center gap-3 sm:w-[180px] sm:shrink-0 sm:pt-3">
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => setRanges(day, checked ? [DEFAULT_RANGE] : [])}
                  aria-label={tSession(`weekday.${day}`)}
                />
                <span className={cn('text-base', enabled ? 'text-foreground' : 'text-foreground')}>
                  {t(`weekday.${day}`)}
                </span>
              </div>

              {enabled ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {ranges.map((range, index) => {
                    const rangeError = rangeErrors?.[day]?.[index];
                    const rangeMessage = rangeError?.to?.message ?? rangeError?.from?.message;

                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <TimeSelect
                          value={range.from}
                          label={t('fromLabel')}
                          invalid={!!rangeError?.from}
                          onChange={(value) =>
                            setRanges(
                              day,
                              ranges.map((item, i) =>
                                i === index ? { ...item, from: value } : item,
                              ),
                            )
                          }
                        />
                        <span aria-hidden="true" className="text-muted-foreground">
                          —
                        </span>
                        <TimeSelect
                          value={range.to}
                          label={t('toLabel')}
                          invalid={!!rangeError?.to}
                          onChange={(value) =>
                            setRanges(
                              day,
                              ranges.map((item, i) =>
                                i === index ? { ...item, to: value } : item,
                              ),
                            )
                          }
                        />
                        {/* The frame shows the bin only from the SECOND range on — the first one is
                          removed by switching the day off, which is the same outcome with a
                          clearer meaning. */}
                        {index > 0 ? (
                          <button
                            type="button"
                            aria-label={t('removeRange')}
                            onClick={() =>
                              setRanges(
                                day,
                                ranges.filter((_, i) => i !== index),
                              )
                            }
                            className="cursor-pointer text-destructive transition-opacity hover:opacity-70"
                          >
                            <Trash2 className="size-[18px]" aria-hidden="true" />
                          </button>
                        ) : null}
                        {rangeMessage ? (
                          <p
                            data-slot="form-message"
                            role="alert"
                            className="basis-full text-sm text-error"
                          >
                            {tValidation(rangeMessage)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}

                  {dayError ? (
                    <p data-slot="form-message" role="alert" className="text-sm text-error">
                      {tValidation(dayError)}
                    </p>
                  ) : null}

                  {ranges.length < MAX_RANGES_PER_DAY ? (
                    <button
                      type="button"
                      onClick={() => setRanges(day, [...ranges, nextRange(ranges)])}
                      className="inline-flex w-fit cursor-pointer items-center gap-1 text-tiny font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      {t('addRange')}
                    </button>
                  ) : null}
                </div>
              ) : (
                <span className="text-base text-muted-foreground sm:pt-3">{t('unavailable')}</span>
              )}
            </div>
          );
        })}
      </div>

      {fieldState.error?.message ? (
        <p data-slot="form-message" role="alert" className="text-sm text-error">
          {tValidation(fieldState.error.message)}
        </p>
      ) : null}
    </div>
  );
}
