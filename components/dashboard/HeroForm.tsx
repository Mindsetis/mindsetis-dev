'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveHeroSection } from '@/app/[locale]/dashboard/profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { CityCombobox, type CitySelection } from '@/components/geo/CityCombobox';
import { AvatarUpload } from '@/components/member-profile/AvatarUpload';
import { InterestsPicker } from '@/components/member-profile/InterestsPicker';
import { LanguagesMultiSelect } from '@/components/member-profile/LanguagesMultiSelect';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { INDUSTRIES, type IndustryValue } from '@/lib/constants/industries';
import type { InterestValue } from '@/lib/constants/interests';
import {
  buildLanguageAliases,
  type LanguageValue,
  SUPPORTED_LANGUAGES,
} from '@/lib/constants/languages';
import type { CountryOption } from '@/lib/geo/countries';
import { createHeroSchema, type HeroInput } from '@/lib/validation/dashboard-profile';
import { MAX_ABOUT_LENGTH, MAX_BIO_LENGTH } from '@/lib/validation/member-profile';

export type HeroFormProps = {
  initialFullName: string;
  initialLastName: string;
  initialUsername: string;
  initialCountryCode?: string;
  initialCity?: CitySelection | null;
  countries: readonly CountryOption[];
  initialLanguages?: LanguageValue[];
  initialBio?: string;
  initialAbout?: string;
  initialInterestIds?: InterestValue[];
  initialAvatarUrl?: string | null;
  initialCompany?: string;
  initialRole?: string;
  initialIndustry?: IndustryValue;
};

/**
 * Cabinet → My Profile → "Hero" editor (Figma `613:4445`).
 *
 * The FIELDS, their order, and their styling are lifted from the registration wizard — this
 * screen edits exactly what sign-up (names), step 3 (`MemberProfileForm`: nickname, location,
 * languages, bio, about, photo, interests) and step 4 (`BuildProfileForm`: company, role,
 * industry) collected, so it reuses the same controls (`AvatarUpload`, `CityCombobox`,
 * `LanguagesMultiSelect`, `InterestsPicker`, `Combobox`) and the same i18n copy rather than
 * inventing a second visual language for the same data (user decision, 2026-08-10).
 *
 * ONE DEVIATION FROM THE FIGMA FRAME, flagged for review: the mock puts "Upload profile photo" at
 * the very top of the section, above First name. This keeps the wizard's own order (photo after
 * About, before Interests) because the instruction was to carry the onboarding fields over "in
 * their sequence". Moving it is a one-block cut/paste if the mock should win.
 *
 * It is NOT a separate form component from `MemberProfileForm` by accident: that one submits
 * profile fields and social links together and then advances the wizard, which is wrong for a
 * cabinet where each section saves independently (see `../../app/[locale]/dashboard/profile/
 * actions.ts` for why the Server Actions are split too).
 */
export function HeroForm({
  initialFullName,
  initialLastName,
  initialUsername,
  initialCountryCode,
  initialCity,
  countries,
  initialLanguages,
  initialBio,
  initialAbout,
  initialInterestIds,
  initialAvatarUrl,
  initialCompany,
  initialRole,
  initialIndustry,
}: HeroFormProps) {
  const t = useTranslations('auth');
  const tCabinet = useTranslations('dashboard.profile');
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  // A photo is only mandatory when the profile doesn't already have one — editing must never
  // force re-picking a file that's already saved (same contract as the wizard's step 3).
  const hasExistingAvatar = Boolean(initialAvatarUrl);

  const form = useForm<HeroInput>({
    resolver: zodResolver(createHeroSchema({ avatarRequired: !hasExistingAvatar })),
    mode: 'onChange',
    defaultValues: {
      fullName: initialFullName,
      lastName: initialLastName,
      username: initialUsername,
      countryCode: initialCountryCode ?? '',
      cityGeonameId: initialCity ? String(initialCity.geonameId) : '',
      languages: initialLanguages ?? [],
      bio: initialBio ?? '',
      about: initialAbout ?? '',
      interestIds: initialInterestIds ?? [],
      company: initialCompany ?? '',
      role: initialRole ?? '',
      industry: initialIndustry,
    },
  });

  const bioValue = useWatch({ control: form.control, name: 'bio' }) ?? '';
  const aboutValue = useWatch({ control: form.control, name: 'about' }) ?? '';

  // The city's display data lives outside RHF: the validated value is just the GeoNames id, and
  // the Server Action re-derives every label from the reference tables.
  const [selectedCity, setSelectedCity] = useState<CitySelection | null>(initialCity ?? null);
  /** What "Cancel" restores the city picker to — moves forward on every successful save, since
   * the page no longer remounts with fresh props after one. */
  const [savedCity, setSavedCity] = useState<CitySelection | null>(initialCity ?? null);
  const countryCodeValue = useWatch({ control: form.control, name: 'countryCode' }) ?? '';

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

    // Built as `FormData` (not a plain object) so the avatar `File` survives the Server Action
    // boundary — `createAction` accepts either shape.
    const formData = new FormData();
    formData.append('fullName', values.fullName);
    formData.append('lastName', values.lastName);
    formData.append('username', values.username);
    formData.append('countryCode', values.countryCode);
    formData.append('cityGeonameId', values.cityGeonameId);
    for (const language of values.languages) formData.append('languages', language);
    formData.append('bio', values.bio);
    if (values.about) formData.append('about', values.about);
    // Omitted when no new file was picked — the action then keeps the stored `avatar_url`.
    if (values.avatar) formData.append('avatar', values.avatar);
    for (const id of values.interestIds) formData.append('interestIds', id);
    formData.append('company', values.company);
    formData.append('role', values.role);
    formData.append('industry', values.industry);

    const result = await saveHeroSection(formData);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Stays on the section rather than returning to the list. `reset(values)` rebases the form so
    // a later "Cancel" reverts to what was just saved, not to what the page originally loaded;
    // `savedCity` does the same for the one piece of state RHF doesn't hold.
    form.reset(values);
    setSavedCity(selectedCity);
    notifySaved();
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
          {/* First field in the section, above First name (Figma `613:4445` — the dropzone sits
              at y=0 of the form). This is the one place the cabinet deviates from the wizard's
              field order, which puts the photo after "About"; the mock is explicit here. */}
          <FormField
            control={form.control}
            name="avatar"
            render={({ field, fieldState }) => (
              <FormItem>
                {/* No `FormLabel`, no `FieldHint` and no `FormMessage`: the dropzone carries its
                    own headline, requirements line AND error state, exactly as the mock draws
                    them — a separate message below would duplicate what the box already says. */}
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {/* `signUp.fullName` IS the first-name label — the key predates the
                        first/second split (`profiles.full_name` holds only the first name). */}
                    {t('signUp.fullName')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {t('signUp.lastName')} <span className="text-primary">*</span>
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="inline-flex items-center gap-1">
                    {tCabinet('nickname')} <span className="text-primary">*</span>
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
                {/* Changing this changes the profile's public URL; links already shared point at
                    the old one and will 404 (no alias table in MVP), so the cost is stated up
                    front rather than discovered later. */}
                <FieldHint>{tCabinet('nicknameHint')}</FieldHint>
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
                    // The country changing is an EVENT that invalidates the city, and the city
                    // is owned here — so it's cleared here rather than in an effect inside
                    // `CityCombobox` (which is additionally keyed on the country below).
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <StepActions
          editMode
          isSubmitting={form.formState.isSubmitting}
          onCancel={() => {
            // Back to the last-saved values (the `defaultValues` captured at mount); stays on
            // the section rather than navigating, so this is an undo, not an exit.
            form.reset();
            // `selectedCity` is the one piece of this form's state that lives OUTSIDE RHF (the
            // picker's display object; RHF only holds the GeoNames id), so `form.reset()` can't
            // reach it — without this the city label would keep showing the discarded choice.
            setSelectedCity(savedCity);
            setFormError(null);
          }}
        />
      </form>
    </Form>
  );
}
