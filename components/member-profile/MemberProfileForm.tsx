'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { saveMemberProfile } from '@/app/[locale]/member-profile/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { AvatarUpload } from '@/components/member-profile/AvatarUpload';
import { type InterestOption, InterestsPicker } from '@/components/member-profile/InterestsPicker';
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
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import {
  MAX_ABOUT_LENGTH,
  MAX_BIO_LENGTH,
  type MemberProfileInput,
  memberProfileSchema,
  OPTIONAL_SOCIAL_FIELDS,
} from '@/lib/validation/member-profile';

type MemberProfileFormProps = {
  interests: InterestOption[];
  /** Prefilled from the caller's already-auto-provisioned `profiles.username`. */
  initialUsername: string;
};

/**
 * Registration wizard step 2/4 ("Member profile") form — mirrors `SignUpForm.tsx`'s
 * structure (RHF + `zodResolver` sharing `memberProfileSchema`, `applyFieldErrors` wiring
 * server-side field errors back onto the form, `primaryOutline`/`lg` submit button).
 *
 * The avatar `File` and the `languages`/`interestIds` arrays are submitted via a manually
 * built `FormData` (rather than a plain object) so the Server Action can receive the real
 * `File` — `createAction` already accepts either shape (see `lib/api/action.ts`).
 */
export function MemberProfileForm({ interests, initialUsername }: MemberProfileFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<MemberProfileInput>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: {
      username: initialUsername,
      country: '',
      city: '',
      languages: [],
      bio: '',
      about: '',
      interestIds: [],
      linkedin: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      threads: '',
      youtube: '',
      website: '',
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
    formData.append('avatar', values.avatar);
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

    // Steps 3/4 of the wizard aren't built yet — land on the homepage, same fallback
    // `SignUpForm` uses when there's nowhere further to send the user.
    router.push('/');
    router.refresh();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
                  <Input type="text" autoComplete="username" {...field} />
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
                  {t('memberProfile.country')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="country-name" {...field} />
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
                  {t('memberProfile.city')} <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="address-level2" {...field} />
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
                  <Textarea className="min-h-[130px]" maxLength={MAX_BIO_LENGTH} {...field} />
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
                  <FormLabel>{t('memberProfile.about')}</FormLabel>
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
                  {t('memberProfile.photo.label')} <span className="text-primary">*</span>
                </FormLabel>
                <AvatarUpload
                  file={field.value ?? null}
                  onFileChange={(file) => field.onChange(file)}
                  triggerLabel={t('memberProfile.photo.upload')}
                  replaceLabel={t('memberProfile.photo.replace')}
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
                <FieldHint>{t('memberProfile.interests.hint')}</FieldHint>
                <InterestsPicker
                  interests={interests}
                  value={field.value}
                  onChange={field.onChange}
                  allCategoryLabel={t('memberProfile.interests.all')}
                  countLabel={(selected, max) =>
                    t('memberProfile.interests.count', { selected, max })
                  }
                />
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
                  <Input type="url" autoComplete="url" {...field} />
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
                    <Input type="url" autoComplete="url" {...field} value={field.value ?? ''} />
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
