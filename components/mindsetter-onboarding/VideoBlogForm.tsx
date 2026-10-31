'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { saveVideoBlog } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyActionFailure } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type FormBanner, FormErrorAlert } from '@/components/ui/form-error-alert';
import { revealOnInvalid } from '@/components/ui/form-errors';
import { Input } from '@/components/ui/input';
import { useRouter } from '@/i18n/navigation';
import { type VideoBlogStepInput, videoBlogStepSchema } from '@/lib/validation/mindsetter';

type VideoBlogFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved `video_blog` jsonb, when the caller revisits this block. */
  initialVideoBlog?: { youtube?: string | null; vimeo?: string | null } | null;
  /** Where "Save and continue" navigates once saved — the next picked block, or Personal
   * session once every picked block is done (`nextBlockHref`, computed by the page from the
   * `?blocks=&i=` handoff). */
  nextHref: string;
};

/**
 * Optional block "Video blog" (un-deferred from Phase 2 back into MVP scope, migration
 * `20260718185944_mindsetter_video_blog.sql`). Mirrors `PromoForm.tsx`'s YouTube/Vimeo URL pair
 * exactly, minus the disabled upload-dropzone placeholder — this block is link-only, no direct
 * video upload is planned for it at all (unlike `promo_video`, which defers upload past MVP but
 * still shows the placeholder dropzone).
 */
export function VideoBlogForm({ initialVideoBlog, nextHref, editMode }: VideoBlogFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<FormBanner>(null);

  const form: UseFormReturn<VideoBlogStepInput> = useForm<VideoBlogStepInput>({
    // `revealOnInvalid` focuses the first error in page order; RHF's own focus would fight it.
    shouldFocusError: false,
    resolver: zodResolver(videoBlogStepSchema),
    mode: 'onChange',
    defaultValues: {
      youtube: initialVideoBlog?.youtube ?? '',
      vimeo: initialVideoBlog?.vimeo ?? '',
    },
  });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19) in
  // both modes: since 2026-09-29 the wizard has a bottom "Back" of its own, which should ask
  // before dropping an edited step just like the cabinet's (see that hook's own doc comment).
  useSectionDirtyGuard(form.formState.isDirty);

  const onSubmit = form.handleSubmit(async (values, event) => {
    setFormError(null);

    const result = await saveVideoBlog(values);
    if (!result.ok) {
      setFormError(applyActionFailure(form, result.error, event));
      return;
    }

    if (editMode) {
      form.reset(values);
      notifySaved(nextHref);
      return;
    }

    router.push(nextHref);
  }, revealOnInvalid);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        <FormErrorAlert messages={formError} />

        <div className="flex flex-col gap-3 md:gap-4">
          <FormField
            control={form.control}
            name="youtube"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing" className="mb-1 text-[#a5a5a5]">
                  {t('blocks.videoBlog.youtubeLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder={t('blocks.videoBlog.youtubePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vimeo"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing" className="mb-1 text-[#a5a5a5]">
                  {t('blocks.videoBlog.vimeoLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder={t('blocks.videoBlog.vimeoPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <StepActions
          onCancel={() => router.push('/dashboard/profile')}
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
