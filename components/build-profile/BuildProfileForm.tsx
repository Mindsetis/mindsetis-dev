'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { saveBuildProfile } from '@/app/[locale]/(app)/build-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { FieldHint } from '@/components/ui/field-hint';
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
import { INDUSTRIES, INDUSTRY_VALUES, type IndustryValue } from '@/lib/constants/industries';
import { type BuildProfileInput, buildProfileSchema } from '@/lib/validation/build-profile';

type BuildProfileFormProps = {
  /** Already-saved step-3 fields, when the caller revisits this page (Back). */
  initialCompany?: string;
  initialRole?: string;
  initialIndustry?: string;
};

/**
 * Registration wizard step 4/4 ("What do you build?") form — mirrors
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`), but simpler:
 * three required fields, no file upload or multi-select controls. Company/Role stay plain
 * text; Industry (stage 1.4 Figma audit) is a fixed-option `Combobox` (`components/ui/combobox.tsx`
 * — Popover + searchable `Command` list, matching `LanguagesMultiSelect`'s visual language but
 * single-select; generalized from an Industry-only component so any other single-select field
 * can reuse the same chrome) sourced from the code-defined `INDUSTRIES` catalog
 * (`lib/constants/industries.ts`) instead of free text.
 */
export function BuildProfileForm({
  initialCompany,
  initialRole,
  initialIndustry,
}: BuildProfileFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<BuildProfileInput>({
    resolver: zodResolver(buildProfileSchema),
    mode: 'onChange',
    defaultValues: {
      company: initialCompany ?? '',
      role: initialRole ?? '',
      // A pre-1.4 profile may have a free-text value that isn't in the fixed catalog anymore —
      // treat anything outside `INDUSTRY_VALUES` as "no selection" rather than crashing the
      // enum-typed field or silently submitting an invalid value. Defaults to `''` rather than
      // `undefined` so `Select` is controlled from the first render — an initially-`undefined`
      // value flips it from uncontrolled to controlled the moment a user picks something,
      // which React warns about; `''` never matches an `IndustryValue`, so it still fails Zod
      // validation the same way `undefined` would if left unselected.
      industry: (INDUSTRY_VALUES as readonly string[]).includes(initialIndustry ?? '')
        ? (initialIndustry as IndustryValue)
        : ('' as IndustryValue),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveBuildProfile(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // This is now the wizard's last step (stage 1.5 renumbering moved email verification to
    // step 2, `/verify-email` — see that page's doc comment), so a successful save moves on to
    // the Congrats screen, not back to verification. `saveBuildProfile`'s welcome-email send is
    // unrelated to navigation here — it's a fire-and-forget informational email, not a gate.
    router.push('/welcome');
  });

  return (
    <Form {...form}>
      {/* Same spacing rhythm as `SignUpForm.tsx`/`MemberProfileForm.tsx`: 16px/24px
          (mobile/desktop) from the field block to the submit button. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('buildProfile.company.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="organization"
                    placeholder={t('buildProfile.company.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('buildProfile.role.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="organization-title"
                    placeholder={t('buildProfile.role.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('buildProfile.industry.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={INDUSTRIES}
                  placeholder={t('buildProfile.industry.placeholder')}
                  searchPlaceholder={t('buildProfile.industry.searchPlaceholder')}
                  emptyLabel={t('buildProfile.industry.empty')}
                  invalid={!!form.formState.errors.industry}
                />
                <FieldHint>{t('buildProfile.industry.hint')}</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? t('signUp.submitting') : t('signUp.submit')}
        </Button>
      </form>
    </Form>
  );
}
