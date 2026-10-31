import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LinkExpiredForm } from '@/components/auth/LinkExpiredForm';
import { LinkExpiredHashReason } from '@/components/auth/LinkExpiredHashReason';
import { Link } from '@/i18n/navigation';

type LinkExpiredPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string; type?: string }>;
};

/** Message-key prefix for the two kinds of dead link — see the page's doc comment. */
function copyPrefix(type: string | undefined): 'linkExpired.recovery' | 'linkExpired' {
  return type === 'recovery' ? 'linkExpired.recovery' : 'linkExpired';
}

// Mirrors the page component's own `isInvalid` branch below, so the tab title always matches
// whichever of the headings actually renders instead of defaulting to one of them.
export async function generateMetadata({ params, searchParams }: LinkExpiredPageProps) {
  const { locale } = await params;
  const { reason, type } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const prefix = copyPrefix(type);
  return { title: t(reason === 'invalid' ? `${prefix}.titleInvalid` : `${prefix}.title`) };
}

/**
 * `/link-expired` — the screen a dead email link lands on.
 *
 * Before this existed, `/api/auth/confirm` sent every failure to `/login?error=invalid_link`:
 * the visitor got the ordinary sign-in screen, greeted with "Welcome back" and a red error on
 * top, in the middle of a registration they had not finished. The client called that out
 * directly — "Welcome Back якось не дуже логічно" — and she is right: it is the wrong screen,
 * the wrong greeting, and it offers no way to get a working link (Release-1 A2).
 *
 * TWO KINDS OF LINK (Release 2 П2). `?type=recovery` — set by `/api/auth/confirm` when the dead
 * link was a PASSWORD-RESET one — switches the whole screen to the reset wording ("This password
 * reset link has expired or has already been used…", "Resend reset link") and makes the form
 * request a new reset email. Without it the screen is the original confirmation-link one, byte
 * for byte: that is what every existing signup link and bookmark still gets.
 *
 * WHY ONLY TWO REASONS, NOT THREE
 *   The task asks to tell apart expired / already-used / invalid. The first two are not
 *   distinguishable here, and pretending otherwise would mean guessing: Supabase consumes a
 *   one-time token on use, so a used link and an expired one both come back as the same
 *   `otp_expired` failure — there is nothing left to inspect. Rather than invent a third state,
 *   the copy for that case names both possibilities out loud ("expired or already been used"),
 *   which is the honest version of the same information and still tells the visitor what to do.
 *   `invalid` stays a separate case: a malformed or tampered link is genuinely different and
 *   nothing should be resent on its own initiative.
 *
 * WHY "EXPIRED" IS THE DEFAULT WHEN `?reason` IS ABSENT
 *   Because that is the live path. Supabase's own `/auth/v1/verify` rejects a dead link by
 *   redirecting here with the reason in the URL fragment, which no server can read — so the
 *   route sends us no `?reason` at all and `LinkExpiredHashReason` fixes the URL up on the
 *   client. Defaulting to the stale-link copy means that common case reads correctly even in
 *   the instant before the client runs, instead of flashing "invalid" at someone whose link
 *   simply aged out.
 *
 * Public by design — there is no session at this point, that being the entire situation.
 */
export default async function LinkExpiredPage({ params, searchParams }: LinkExpiredPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { reason, type } = await searchParams;
  const t = await getTranslations('auth');

  const isInvalid = reason === 'invalid';
  const isRecovery = type === 'recovery';
  const prefix = copyPrefix(type);

  return (
    <AuthScreen
      title={isInvalid ? t(`${prefix}.titleInvalid`) : t(`${prefix}.title`)}
      subtitle={isInvalid ? t(`${prefix}.bodyInvalid`) : t(`${prefix}.body`)}
    >
      <LinkExpiredHashReason />
      <LinkExpiredForm variant={isRecovery ? 'recovery' : 'signup'} />

      {/* The client's own second exit: someone whose account is already active doesn't need a
          new link at all, they just need the sign-in screen — which is exactly what they were
          wrongly dumped onto before, except now it's a choice instead of a dead end. */}
      <p className="text-center text-sm text-muted-foreground">
        {t(`${prefix}.loginPrompt`)}{' '}
        <Link href="/login" className="text-primary underline underline-offset-4">
          {t(`${prefix}.loginCta`)}
        </Link>
      </p>
    </AuthScreen>
  );
}
