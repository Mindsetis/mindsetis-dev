import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  CABINET_PATH,
  fetchMindsetterOnboardingStep,
  LOGIN_PATH,
  mindsetterResumePath,
} from '@/lib/auth/onboarding-redirect';
import { createClient } from '@/lib/supabase/server';

type MindsetterOnboardingEntryPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Single entry into the Mindsetter wizard (Release-2 П4/П5, call of 28.10.2026) for the controls
 * that don't know the caller's progress — the Upgrade dialog and `/welcome` point here instead of
 * at `/roles`, so a Member who already started resumes at their next unsaved step rather than at
 * the first one. (The header's "Continue Registration" and the cabinet status banner already read
 * the step, so they link straight to `mindsetterResumePath` and skip this hop.) Nothing is rendered:
 * the destination is decided from stored progress (`mindsetterResumePath`), the same way
 * `/continue` does it for the Member wizard. A Mindsetter has nothing left to resume.
 */
export default async function MindsetterOnboardingEntryPage({
  params,
}: MindsetterOnboardingEntryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: LOGIN_PATH, locale });
    return null;
  }

  if (session.profile.account_type === 'mindsetter') {
    redirect({ href: CABINET_PATH, locale });
    return null;
  }

  const supabase = await createClient();
  const step = await fetchMindsetterOnboardingStep(supabase, session.user.id);
  redirect({ href: mindsetterResumePath(step), locale });
  return null;
}
