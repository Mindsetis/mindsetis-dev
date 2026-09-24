'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { saveSocialLinks } from '@/app/[locale]/(app)/dashboard/profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { type SocialLinksInput, socialLinksSchema } from '@/lib/validation/dashboard-profile';
import { OPTIONAL_SOCIAL_FIELDS } from '@/lib/validation/member-profile';

export type SocialLinksFormProps = {
  initialSocials?: {
    website?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    threads?: string;
    youtube?: string;
  };
  /** Where "Save & Next" navigates once saved — the next card in cabinet section order, computed
   * by the page via `lib/profile/completeness.ts#nextSectionHref` (Release-1 C3). */
  nextHref: string;
};

/**
 * Cabinet → My Profile → "Social links" editor (Figma `613:4606`).
 *
 * Same fields, order and styling as the wizard's step 3 renders them — Company website first
 * (the one REQUIRED channel), then the optional ones in `OPTIONAL_SOCIAL_FIELDS` order.
 *
 * The Figma frame marks "LinkedIn URL" as the required field; that mock predates the 2026-08-05
 * product decision that made the COMPANY WEBSITE the mandatory channel instead (a company site is
 * the stronger signal for a member-first community, and requiring LinkedIn excluded people who
 * don't use it). The user confirmed on 2026-08-10 that the newer rule wins, so this form follows
 * `socialLinkFields`, not the mock.
 */
export function SocialLinksForm({ initialSocials, nextHref }: SocialLinksFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SocialLinksInput>({
    resolver: zodResolver(socialLinksSchema),
    mode: 'onChange',
    defaultValues: {
      website: initialSocials?.website ?? '',
      linkedin: initialSocials?.linkedin ?? '',
      instagram: initialSocials?.instagram ?? '',
      facebook: initialSocials?.facebook ?? '',
      tiktok: initialSocials?.tiktok ?? '',
      threads: initialSocials?.threads ?? '',
      youtube: initialSocials?.youtube ?? '',
    },
  });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19) so
  // every exit path — not just this form's own "Back" — can ask before leaving a dirty edit.
  useSectionDirtyGuard(form.formState.isDirty);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    // Plain object, not FormData — no file fields here, and `createAction` accepts either.
    const result = await saveSocialLinks(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // `reset(values)` rebases the form so `formState.isDirty` reads clean right after a save.
    // "Save & Next" then navigates to the next section (`nextHref`).
    form.reset(values);
    notifySaved(nextHref);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing">
                  <span className="inline-flex items-center gap-1">
                    {t('memberProfile.socials.website')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    autoComplete="url"
                    placeholder={t('memberProfile.socials.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {OPTIONAL_SOCIAL_FIELDS.map((social) => (
            <FormField
              key={social}
              control={form.control}
              name={social}
              render={({ field }) => (
                <FormItem>
                  <FormLabel variant="boldSpacing">
                    {t(`memberProfile.socials.${social}`)}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      autoComplete="url"
                      placeholder={t('memberProfile.socials.placeholder')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <StepActions
          onCancel={() => router.push('/dashboard/profile')}
          editMode
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
