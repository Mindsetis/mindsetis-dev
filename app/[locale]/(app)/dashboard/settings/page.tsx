import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { loadCabinetProfile } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SettingsPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.settings');
}

/**
 * Cabinet → Settings (Figma `708:9177` Member / `623:6559` Mindsetter).
 *
 * The design's full page has seven cards — Video calls, Account, Verification, Notifications,
 * Language and region, Privacy, and "Pause or close your account". Only **Account** is built
 * (2026-08-11 scope decision); the rest depend on features that don't exist yet (Google Meet /
 * Zoom connections, the verification pipeline, notification preferences), and account deletion was
 * explicitly deferred. The card stack is a plain column, so adding the others later is additive.
 *
 * Both account types get the identical page: the two frames differ only inside cards that aren't
 * built here (Notifications' first row, and a "Last changed …" note under Change password that we
 * can't render because password-change timestamps aren't stored).
 */
export default async function DashboardSettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.settings');

  const cabinet = await loadCabinetProfile();
  if (!cabinet) {
    redirect({ href: '/login', locale });
    return null;
  }

  // The email lives on the auth user, not on `profiles` — `loadCabinetProfile` doesn't carry it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="flex flex-col gap-6">
      {/* Same heading treatment as My Profile's (`font-display text-m font-normal`) — in the
          design both tabs open with the identical 22px Cal Sans title. */}
      <h2 className="font-display text-m font-normal text-foreground">{t('title')}</h2>

      {/* `gap-3` (12px) between cards, per the design's card stack. */}
      <div className="flex flex-col gap-3">
        <section className="flex flex-col gap-6 rounded-xl border border-[#2a2a2a] bg-card p-7">
          <h3 className="text-base font-normal text-foreground">{t('account.title')}</h3>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-email">{t('account.email')}</Label>
            {/* Read-only rather than disabled: the design shows the address in an input-shaped box
                with no edit affordance, and changing it isn't offered anywhere on this screen. A
                `disabled` input would also drop out of the tab order and stop being selectable,
                which would make the one thing you'd actually want here — copying your own address —
                needlessly awkward. */}
            <Input
              id="account-email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              aria-readonly="true"
              className="text-muted-foreground focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-5">
            <h4 className="text-base font-normal text-foreground">
              {t('account.changePassword.title')}
            </h4>
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </section>
  );
}
