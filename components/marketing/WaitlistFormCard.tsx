'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { submitHomepageWaitlist } from '@/app/[locale]/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { JoinIcon } from '@/components/icons/join-icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  type HomepageWaitlistInput,
  homepageWaitlistSchema,
} from '@/lib/validation/homepage-waitlist';

/**
 * "Apply to Join" waitlist form card — Figma "Заглушка" form card. On a successful
 * `submitHomepageWaitlist` call, swaps client-side (no route change) into the "Thank you"
 * state (Figma `870:4928` desktop / `870:4977` mobile) occupying the same position — the
 * hero above (`HomepagePlaceholder`) is untouched, only this card area changes.
 *
 * PIXEL-ACCURACY PASS (re-verified against the live Figma nodes):
 * - Card (`866:4827` "Frame 144"): `#1a1a1a` fill, 1px `#747474` border, 16px radius, 32px
 *   padding — already exactly `rounded-2xl border-border bg-card p-8` (Tailwind's un-tokenized
 *   `2xl` step is 16px; `--radius` itself is only redefined for `sm`/`md`/`lg`/`xl`), confirmed,
 *   unchanged.
 * - Inputs (`866:4829`/`870:5564`/`866:4831`): 12px radius, 1px `#747474` border, 16px padding,
 *   `#a5a5a5` placeholder — already exactly what `components/ui/input.tsx` renders
 *   (`rounded-lg`/`border-input`/`p-4`/`placeholder:text-muted-foreground`), confirmed,
 *   unchanged.
 * - Card heading (`866:4828` desktop / `866:5543` mobile): differs by breakpoint, re-verified via
 *   screenshot — desktop is flat white 22px Cal Sans regular (`--text-m` + `font-display`);
 *   mobile is a `#79b9e3`-toned "gradient / brand" text fill (screenshot-confirmed light-blue,
 *   not white) at 16px Manrope BOLD. Was a flat `font-display text-l` (32px, no responsive step,
 *   not centered) at every breakpoint — corrected to toggle both size/weight/font AND the
 *   gradient-vs-flat color per breakpoint (`md:bg-none md:bg-clip-border` cleanly turns the
 *   mobile gradient-clip off again at `md:`, reusing the same white→`#87bce6` gradient
 *   `HomepagePlaceholder`'s own H1 uses — the two-stop brand gradient is otherwise a repeated
 *   inline value across this app's hero/heading treatments, not a separate token).
 * - Submit button (`866:4832` "Primary"): confirmed via the node tree this already is the
 *   project's gradient-fill `primary` Button variant (12px radius, gradient background, black
 *   `--color-primary-foreground` text) — NOT a plain solid button. The one real gap: Figma's
 *   instance renders a visible 16×16 "Icon slot" (the same two-path glyph as `Header`'s Join
 *   CTA) to the left of the "Apply to Join" label; the other icon variants in the node tree
 *   (`user-add-fill`/`ball-pen-fill`/`account-pin-box-fill`) are sibling component-variant slots
 *   that aren't the one actually shown, same as in `Header`'s own "Primary" instance. Added the
 *   shared `JoinIcon` (extracted from `Header.tsx` to `components/icons/join-icon.tsx` so both
 *   call sites reuse the identical glyph instead of duplicating the inline SVG).
 */
export function WaitlistFormCard() {
  const t = useTranslations('home.placeholder');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<HomepageWaitlistInput>({
    resolver: zodResolver(homepageWaitlistSchema),
    defaultValues: { firstName: '', email: '', socialLink: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await submitHomepageWaitlist(values);
    if (!result.ok) {
      // `conflict` (duplicate email, see `submitHomepageWaitlist`) gets a localized inline
      // field error instead of the server's hardcoded fallback message — same "prefer a
      // localized copy for known error codes" approach, since Server Action error strings
      // aren't routed through next-intl (see `lib/api`'s convention).
      if (result.error.code === 'conflict') {
        form.setError('email', { type: 'server', message: t('form.duplicateEmail') });
        return;
      }
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="flex w-full max-w-[560px] flex-col items-center gap-3 text-center">
        {/* Figma: `870:5469` mobile "MOB/H2" is 24px/24px (100%), not the shared `--text-h1`
            mobile step (32px) — no existing token covers this exact size, so it's set explicitly
            rather than reusing `text-h1`. Desktop `870:4955` "H3 (PC)" is 48px/90%, which *is*
            the shared `--text-h3` token. */}
        <h2 className="bg-[linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)] bg-clip-text font-display text-[1.5rem] leading-none text-transparent md:text-h3 md:leading-[0.9]">
          {t('thankYou.title')}
        </h2>
        <p className="font-sans text-body font-bold text-foreground md:max-w-[688px] md:font-display md:text-m md:font-normal">
          {t('thankYou.subtitle')}
        </p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-[480px] gap-6 rounded-2xl border-border bg-card p-8">
      <CardContent className="flex flex-col gap-6 p-0">
        <h2 className="bg-[linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)] bg-clip-text text-center font-sans text-body font-bold text-transparent md:bg-none md:bg-clip-border md:font-display md:text-m md:font-normal md:text-foreground">
          {t('form.heading')}
        </h2>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('form.firstName.label')} <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="given-name"
                      placeholder={t('form.firstName.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('form.email.label')} <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t('form.email.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="socialLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="inline-flex items-center gap-1">
                      {t('form.socialLink.label')} <span className="text-primary">*</span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="url"
                      placeholder={t('form.socialLink.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" variant="primary" size="lg" loading={form.formState.isSubmitting}>
              <JoinIcon />
              {t('form.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
