import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SessionsSetupForm } from '@/components/dashboard/SessionsSetupForm';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import { type Expertise, WEEKDAYS, type WeeklyAvailability } from '@/lib/validation/mindsetter';

type SessionsPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Normalizes the stored `weekly_availability` jsonb into the exact seven-key shape the form
 * expects. The column tolerates missing days (absent === unavailable) and, being jsonb, could hold
 * anything a future writer puts there — so every key is rebuilt and anything unrecognised is
 * dropped rather than trusted into a controlled input.
 */
function parseWeeklyAvailability(value: unknown): WeeklyAvailability {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const record = source as Record<string, unknown>;

  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      const ranges = Array.isArray(record[day]) ? (record[day] as unknown[]) : [];
      const parsed = ranges
        .map((range) => {
          if (!range || typeof range !== 'object') return null;
          const { from, to } = range as { from?: unknown; to?: unknown };
          return typeof from === 'string' && typeof to === 'string' ? { from, to } : null;
        })
        .filter((range): range is { from: string; to: string } => range !== null);
      return [day, parsed];
    }),
  ) as WeeklyAvailability;
}

/**
 * Cabinet → Sessions Setup (Figma `1094:23946` desktop / `1091:10460` mobile).
 *
 * Mindsetter-only, like the Mindsetter-specific profile sections: `requireMindsetterCabinet()`
 * → `notFound()` for a Member, whose sidebar has no MINDSETTER group at all.
 *
 * The page title follows the sidebar and the mobile frame ("Sessions Setup"); the desktop frame
 * still says "Session Settings", which reads as copy that wasn't updated when the section was
 * renamed.
 */
export default async function DashboardSessionsPage({ params }: SessionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.sessions');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const [{ data: mindsetterProfile }, { data: settings }] = await Promise.all([
    supabase.from('mindsetter_profiles').select('help_with').eq('id', cabinet.userId).maybeSingle(),
    supabase
      .from('session_settings')
      .select(
        'accepts_bookings, session_type, price_cents, durations, topics, timezone, weekly_availability, fee_consent_accepted',
      )
      .eq('mindsetter_id', cabinet.userId)
      .maybeSingle(),
  ]);

  // "What I help with" card titles are the suggested topics (same source the wizard used).
  const expertise = (mindsetterProfile?.help_with ?? []) as Expertise[];
  const topicOptions = expertise.map((item) => item.title).filter(Boolean);

  const initialSettings = settings
    ? {
        acceptsBookings: settings.accepts_bookings,
        sessionType: (settings.session_type ?? 'free') as 'free' | 'paid',
        priceCents: settings.price_cents,
        durations: settings.durations ?? [30],
        topics: settings.topics ?? [],
        timezone: settings.timezone ?? '',
        weeklyAvailability: parseWeeklyAvailability(settings.weekly_availability),
        feeConsentAccepted: settings.fee_consent_accepted ?? false,
      }
    : undefined;

  return (
    <section className="flex flex-col">
      <h2 className="font-display text-[24px] font-normal text-foreground lg:text-m">
        {t('title')}
      </h2>

      {/* The intro copy and the IMPORTANT notice share one card (2026-08-13 request) rather than
          sitting loose on the page. Spacing around it is asymmetric on mobile by request: 32px
          above, 12px below; 20px both ways from `lg`. */}
      <div className="mt-8 mb-3 flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-card p-6 lg:mt-5 lg:mb-5">
        <p className="text-base text-foreground">{t('intro')}</p>

        {/* Yellow notice — 15%-opacity fill on a solid border. */}
        <div className="flex flex-col gap-1 rounded-xl border border-[#f5c64d] bg-[#f5c64d]/15 p-4">
          <span className="text-[11px] font-bold tracking-[0.3em] text-[#f5c64d] uppercase">
            {t('importantLabel')}
          </span>
          <p className="text-tiny text-foreground">{t('important')}</p>
        </div>
      </div>

      <SessionsSetupForm topicOptions={topicOptions} initialSettings={initialSettings} />
    </section>
  );
}
