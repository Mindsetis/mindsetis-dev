'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { recordSignupIntent } from '@/app/[locale]/actions';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { type EmailCaptureInput, emailCaptureSchema } from '@/lib/validation/marketing';

/**
 * Hero "quick start" email capture — Figma "Frame 276" (Welcome Screen, below the CTA
 * button). Validates the email client-side, best-effort records it as a "signup intent" lead
 * (`recordSignupIntent`, spec §5.2 reworked stage 1.7) via the unauthenticated Server Action
 * (the write itself runs as service-role — see that action's doc comment), then hands
 * the visitor into sign-up regardless of whether that best-effort call succeeded — carrying
 * the email along as a query param so `SignUpForm` can prefill it (Zod-validated again at
 * that boundary via `emailSchema.safeParse` in `app/[locale]/sign-up/page.tsx`). A failure to
 * record the lead is not the visitor's problem (nothing looked wrong to them — they're still
 * headed to sign-up), so it's only logged, never surfaced as an error toast.
 */
export function HeroEmailCta() {
  const t = useTranslations('home.hero');
  const router = useRouter();

  const form = useForm<EmailCaptureInput>({
    resolver: zodResolver(emailCaptureSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const result = await recordSignupIntent({ email });
    if (!result.ok) {
      console.error('[HeroEmailCta] recordSignupIntent failed:', result.error);
    }
    router.push(`/sign-up?email=${encodeURIComponent(email)}`);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('emailLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
                  className="h-14 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          {t('continue')}
        </Button>
      </form>
    </Form>
  );
}
