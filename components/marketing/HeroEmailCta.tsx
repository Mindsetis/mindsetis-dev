'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

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
 * button). There's no dedicated "start with email" Server Action yet, so this validates the
 * email client-side and hands the visitor to the real sign-up flow — the only concrete next
 * step that exists today.
 */
export function HeroEmailCta() {
  const t = useTranslations('home.hero');
  const router = useRouter();

  const form = useForm<EmailCaptureInput>({
    resolver: zodResolver(emailCaptureSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(() => {
    router.push('/sign-up');
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailLabel')}</FormLabel>
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
          variant="outline"
          size="lg"
          className="w-full border-primary text-primary shadow-glow-primary hover:bg-primary/10"
          loading={form.formState.isSubmitting}
        >
          {t('continue')}
        </Button>
      </form>
    </Form>
  );
}
