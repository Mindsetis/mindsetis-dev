'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { signOut } from '@/app/[locale]/(app)/(auth)/actions';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';

/** Small client island: signs the user out, then refreshes the (now signed-out) UI. */
export function SignOutButton() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const result = await signOut({});
      if (!result.ok) {
        console.error('[sign-out] failed:', result.error.message);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  return (
    <Button type="button" variant="nav" size="sm" onClick={handleSignOut} disabled={isPending}>
      {isPending ? t('signingOut') : t('signOut')}
    </Button>
  );
}
