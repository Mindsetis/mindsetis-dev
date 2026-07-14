'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { saveBuildProfile } from '@/app/[locale]/build-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
 * Registration wizard step 3/4 ("What do you build?") form — mirrors
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`), but simpler:
 * three required fields, no file upload or multi-select controls. Company/Role stay plain
 * text; Industry (stage 1.4 Figma audit) is a fixed-option `Select` sourced from the
 * code-defined `INDUSTRIES` catalog (`lib/constants/industries.ts`) instead of free text.
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
    defaultValues: {
      company: initialCompany ?? '',
      role: initialRole ?? '',
      // A pre-1.4 profile may have a free-text value that isn't in the fixed catalog anymore —
      // treat anything outside `INDUSTRY_VALUES` as "no selection" rather than crashing the
      // enum-typed field or silently submitting an invalid value.
      industry: (INDUSTRY_VALUES as readonly string[]).includes(initialIndustry ?? '')
        ? (initialIndustry as IndustryValue)
        : undefined,
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

    // Step 4/4 — "Check your inbox" (see `saveBuildProfile`'s confirmation-email re-send).
    const query = result.data.email ? `?email=${encodeURIComponent(result.data.email)}` : '';
    router.push(`/verify-email${query}`);
  });

  return (
    <Form {...form}>
      {/* Outer gap is 16px (Figma's field-block-to-submit-button spacing) — the fields
          themselves keep their own tighter 12px (`gap-3`) rhythm in the wrapper below. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
                  {t('buildProfile.company.label')} <span className="text-primary">*</span>
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
                  {t('buildProfile.role.label')} <span className="text-primary">*</span>
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
                  {t('buildProfile.industry.label')} <span className="text-primary">*</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('buildProfile.industry.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
