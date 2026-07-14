'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveMemberProfile } from '@/app/[locale]/member-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { AvatarUpload } from '@/components/member-profile/AvatarUpload';
import { InterestsPicker } from '@/components/member-profile/InterestsPicker';
import { LanguagesMultiSelect } from '@/components/member-profile/LanguagesMultiSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import type { InterestValue } from '@/lib/constants/interests';
import { type LanguageValue, SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import {
  createMemberProfileSchema,
  MAX_ABOUT_LENGTH,
  MAX_BIO_LENGTH,
  type MemberProfileInput,
  OPTIONAL_SOCIAL_FIELDS,
} from '@/lib/validation/member-profile';

/** Matches `profiles.socials` jsonb shape written by `saveMemberProfile`. */
type InitialSocials = {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  threads?: string;
  youtube?: string;
  website?: string;
};

type MemberProfileFormProps = {
  /** Prefilled from the caller's already-auto-provisioned `profiles.username`. */
  initialUsername: string;
  /**
   * The rest of this step's already-saved `profiles` data, when the caller revisits this
   * page after a previous submission (e.g. Back from step 3) — `undefined`/omitted fields
   * fall back to an empty value, same as a brand-new profile. See
   * `app/[locale]/member-profile/page.tsx`.
   */
  initialCountry?: string;
  initialCity?: string;
  initialLanguages?: LanguageValue[];
  initialBio?: string;
  initialAbout?: string;
  initialInterestIds?: InterestValue[];
  /** Already-saved photo, if any — shown as the initial preview (`AvatarUpload`) and makes
   *  the photo field optional on resubmission (see `createMemberProfileSchema`). */
  initialAvatarUrl?: string | null;
  initialSocials?: InitialSocials;
};

/**
 * Registration wizard step 2/4 ("Member profile") form — mirrors `SignUpForm.tsx`'s
 * structure (RHF + `zodResolver` over `createMemberProfileSchema(...)`, `applyFieldErrors`
 * wiring server-side field errors back onto the form, `primaryOutline`/`lg` submit button).
 *
 * The avatar `File` and the `languages`/`interestIds` arrays are submitted via a manually
 * built `FormData` (rather than a plain object) so the Server Action can receive the real
 * `File` — `createAction` already accepts either shape (see `lib/api/action.ts`).
 */
export function MemberProfileForm({
  initialUsername,
  initialCountry,
  initialCity,
  initialLanguages,
  initialBio,
  initialAbout,
  initialInterestIds,
  initialAvatarUrl,
  initialSocials,
}: MemberProfileFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  // A photo is only mandatory the first time through this step — once `profiles.avatar_url`
  // is already set, resubmitting shouldn't force picking a new file (see
  // `createMemberProfileSchema`'s doc comment).
  const hasExistingAvatar = Boolean(initialAvatarUrl);

  const form = useForm<MemberProfileInput>({
    resolver: zodResolver(createMemberProfileSchema({ avatarRequired: !hasExistingAvatar })),
    defaultValues: {
      username: initialUsername,
      country: initialCountry ?? '',
      city: initialCity ?? '',
      languages: initialLanguages ?? [],
      bio: initialBio ?? '',
      about: initialAbout ?? '',
      interestIds: initialInterestIds ?? [],
      linkedin: initialSocials?.linkedin ?? '',
      instagram: initialSocials?.instagram ?? '',
      facebook: initialSocials?.facebook ?? '',
      tiktok: initialSocials?.tiktok ?? '',
      threads: initialSocials?.threads ?? '',
      youtube: initialSocials?.youtube ?? '',
      website: initialSocials?.website ?? '',
    },
  });

  const bioValue = useWatch({ control: form.control, name: 'bio' }) ?? '';
  const aboutValue = useWatch({ control: form.control, name: 'about' }) ?? '';

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const formData = new FormData();
    formData.append('username', values.username);
    formData.append('country', values.country);
    formData.append('city', values.city);
    for (const language of values.languages) formData.append('languages', language);
    formData.append('bio', values.bio);
    if (values.about) formData.append('about', values.about);
    // Omitted entirely when the caller didn't pick a new file — the Server Action then
    // reuses the existing `profiles.avatar_url` (see `saveMemberProfile`) instead of
    // requiring a re-upload on every resubmission of this step.
    if (values.avatar) formData.append('avatar', values.avatar);
    for (const id of values.interestIds) formData.append('interestIds', id);
    formData.append('linkedin', values.linkedin);
    for (const field of OPTIONAL_SOCIAL_FIELDS) {
      const fieldValue = values[field];
      if (fieldValue) formData.append(field, fieldValue);
    }

    const result = await saveMemberProfile(formData);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Step 3/4 — "What do you build?" (stage 1.2 registration-wizard reorder).
    router.push('/build-profile');
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('signUp.username')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="username"
                    placeholder={t('signUp.usernamePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('memberProfile.country.label')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="country-name"
                    placeholder={t('memberProfile.country.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('memberProfile.city.label')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="address-level2"
                    placeholder={t('memberProfile.city.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="languages"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {t('memberProfile.languages.label')} <span className="text-primary">*</span>
                </FormLabel>
                <LanguagesMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={SUPPORTED_LANGUAGES}
                  placeholder={t('memberProfile.languages.placeholder')}
                  searchPlaceholder={t('memberProfile.languages.searchPlaceholder')}
                  emptyLabel={t('memberProfile.languages.empty')}
                  removeLabel={(label) => t('memberProfile.languages.remove', { label })}
                  invalid={!!fieldState.error}
                />
                <FieldHint>{t('memberProfile.languages.hint')}</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>
                    {t('memberProfile.bio.label')} <span className="text-primary">*</span>
                  </FormLabel>
                  <span className="text-tiny text-muted-foreground">
                    {t('memberProfile.bio.charCount', {
                      count: bioValue.length,
                      max: MAX_BIO_LENGTH,
                    })}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    className="min-h-[130px]"
                    maxLength={MAX_BIO_LENGTH}
                    placeholder={t('memberProfile.bio.placeholder', { max: MAX_BIO_LENGTH })}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="about"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>{t('memberProfile.about.label')}</FormLabel>
                  <span className="text-tiny text-muted-foreground">
                    {t('memberProfile.bio.charCount', {
                      count: aboutValue.length,
                      max: MAX_ABOUT_LENGTH,
                    })}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    className="min-h-[130px]"
                    maxLength={MAX_ABOUT_LENGTH}
                    placeholder={t('memberProfile.about.placeholder', { max: MAX_ABOUT_LENGTH })}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatar"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing">
                  {t('memberProfile.photo.label')}
                  {!hasExistingAvatar && <span className="text-primary">*</span>}
                </FormLabel>
                <AvatarUpload
                  file={field.value ?? null}
                  onFileChange={(file) => field.onChange(file)}
                  triggerLabel={t('memberProfile.photo.upload')}
                  replaceLabel={t('memberProfile.photo.replace')}
                  initialAvatarUrl={initialAvatarUrl}
                />
                <FieldHint>{t('memberProfile.photo.hint')}</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interestIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing">{t('memberProfile.interests.title')}</FormLabel>
                <InterestsPicker
                  value={field.value}
                  onChange={field.onChange}
                  allCategoryLabel={t('memberProfile.interests.all')}
                />
                <FieldHint>{t('memberProfile.interests.hint')}</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkedin"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing">
                  {t('memberProfile.socials.linkedin')} <span className="text-primary">*</span>
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
