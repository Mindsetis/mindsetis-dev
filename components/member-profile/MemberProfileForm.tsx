'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveMemberProfile } from '@/app/[locale]/member-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { CityCombobox, type CitySelection } from '@/components/geo/CityCombobox';
import { AvatarUpload } from '@/components/member-profile/AvatarUpload';
import { InterestsPicker } from '@/components/member-profile/InterestsPicker';
import { LanguagesMultiSelect } from '@/components/member-profile/LanguagesMultiSelect';
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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import type { InterestValue } from '@/lib/constants/interests';
import {
  buildLanguageAliases,
  type LanguageValue,
  SUPPORTED_LANGUAGES,
} from '@/lib/constants/languages';
import type { CountryOption } from '@/lib/geo/countries';
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
  /** ISO 3166-1 alpha-2 of the saved country, if this step was completed before. */
  initialCountryCode?: string;
  /** Saved city, rebuilt from the profile's denormalized snapshot + codes so the trigger can
   * show it without a lookup round-trip on mount. */
  initialCity?: CitySelection | null;
  /** Whole `geo_countries` list (252 rows), loaded once in the RSC page. Small enough to pass
   * down as a prop — unlike cities, which are 170k rows and must stay a remote search. */
  countries: readonly CountryOption[];
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
 * Registration wizard step 3/4 ("Member profile") form — mirrors `SignUpForm.tsx`'s
 * structure (RHF + `zodResolver` over `createMemberProfileSchema(...)`, `applyFieldErrors`
 * wiring server-side field errors back onto the form, `primaryOutline`/`lg` submit button).
 *
 * The avatar `File` and the `languages`/`interestIds` arrays are submitted via a manually
 * built `FormData` (rather than a plain object) so the Server Action can receive the real
 * `File` — `createAction` already accepts either shape (see `lib/api/action.ts`).
 */
export function MemberProfileForm({
  initialUsername,
  initialCountryCode,
  initialCity,
  countries,
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
    mode: 'onChange',
    defaultValues: {
      username: initialUsername,
      countryCode: initialCountryCode ?? '',
      cityGeonameId: initialCity ? String(initialCity.geonameId) : '',
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

  // The city's display data (name + region + timezone) is held outside RHF on purpose: the
  // validated form value is just the GeoNames id, and the Server Action re-derives every
  // label from the database rather than trusting anything sent from here.
  const [selectedCity, setSelectedCity] = useState<CitySelection | null>(initialCity ?? null);
  const countryCodeValue = useWatch({ control: form.control, name: 'countryCode' }) ?? '';
  // Built once per mount rather than baked into the catalog constant: the aliases come from
  // `Intl.DisplayNames`, which is a runtime API, and keeping them out of
  // `SUPPORTED_LANGUAGES` leaves that file a plain, reviewable data table.
  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((language) => ({
        value: language.value,
        label: language.label,
        keywords: buildLanguageAliases(language.code, language.label),
      })),
    [],
  );

  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: country.name,
        keywords: country.searchNames,
      })),
    [countries],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const formData = new FormData();
    formData.append('username', values.username);
    formData.append('countryCode', values.countryCode);
    formData.append('cityGeonameId', values.cityGeonameId);
    for (const language of values.languages) formData.append('languages', language);
    formData.append('bio', values.bio);
    if (values.about) formData.append('about', values.about);
    // Omitted entirely when the caller didn't pick a new file — the Server Action then
    // reuses the existing `profiles.avatar_url` (see `saveMemberProfile`) instead of
    // requiring a re-upload on every resubmission of this step.
    if (values.avatar) formData.append('avatar', values.avatar);
    for (const id of values.interestIds) formData.append('interestIds', id);
    formData.append('website', values.website);
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

    // Step 4/4 — "What do you build?" (stage 1.5 registration-wizard renumbering).
    router.push('/build-profile');
  });

  return (
    <Form {...form}>
      {/* Same spacing rhythm as `SignUpForm.tsx`: 16px/24px (mobile/desktop) from the field
          block to the submit button, 12px/16px between individual fields. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('signUp.username')} <span className="text-primary">*</span>
                  </span>
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
            name="countryCode"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('memberProfile.country.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <Combobox
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    // Clearing the city belongs in this handler, not in an effect inside
                    // `CityCombobox`: the country changing is an EVENT, and the city it
                    // invalidates is owned here. `CityCombobox` is additionally keyed on the
                    // country below so its own query/result cache resets with it.
                    if (next !== field.value) {
                      setSelectedCity(null);
                      form.setValue('cityGeonameId', '', { shouldValidate: false });
                    }
                  }}
                  options={countryOptions}
                  placeholder={t('memberProfile.country.placeholder')}
                  searchPlaceholder={t('memberProfile.country.searchPlaceholder')}
                  emptyLabel={t('memberProfile.country.empty')}
                  invalid={!!fieldState.error}
                  searchable
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cityGeonameId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('memberProfile.city.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <CityCombobox
                  key={countryCodeValue}
                  countryCode={countryCodeValue}
                  value={selectedCity}
                  onChange={(city) => {
                    setSelectedCity(city);
                    // RHF only ever holds the id — the display object lives in local state,
                    // so the validated form value stays a plain scalar (see the schema note
                    // on why `z.coerce` is avoided here).
                    field.onChange(city ? String(city.geonameId) : '');
                  }}
                  placeholder={t('memberProfile.city.placeholder')}
                  searchPlaceholder={t('memberProfile.city.searchPlaceholder')}
                  emptyLabel={t('memberProfile.city.empty')}
                  loadingLabel={t('memberProfile.city.loading')}
                  disabledLabel={t('memberProfile.city.pickCountryFirst')}
                  invalid={!!fieldState.error}
                />
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
                  <span className="inline-flex items-center gap-1">
                    {t('memberProfile.languages.label')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <LanguagesMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={languageOptions}
                  placeholder={t('memberProfile.languages.placeholder')}
                  searchPlaceholder={t('memberProfile.languages.searchPlaceholder')}
                  emptyLabel={t('memberProfile.languages.empty')}
                  removeLabel={(label) => t('memberProfile.languages.remove', { label })}
                  invalid={!!fieldState.error}
                  searchable
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
                    <span className="inline-flex items-center gap-1">
                      {t('memberProfile.bio.label')} <span className="text-primary">*</span>
                    </span>
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
            render={({ field, fieldState }) => (
              <FormItem>
                {/* Same dropzone as the cabinet's Hero section (2026-08-11) — the label, the
                    separate hint line and the error message are gone because the box now carries
                    all three itself. Its POSITION in this step is unchanged: the wizard's own
                    frame keeps the photo below the text fields, only the cabinet's mock moves it
                    to the top. */}
                <AvatarUpload
                  file={field.value ?? null}
                  onFileChange={(file) => field.onChange(file)}
                  triggerLabel={t('memberProfile.photo.uploadTitle')}
                  replaceLabel={t('memberProfile.photo.replace')}
                  hint={t('memberProfile.photo.requirements')}
                  uploadedLabel={t('memberProfile.photo.uploaded')}
                  error={fieldState.error?.message}
                  initialAvatarUrl={initialAvatarUrl}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interestIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing" className="mb-1">
                  {t('memberProfile.interests.title')}
                </FormLabel>
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
