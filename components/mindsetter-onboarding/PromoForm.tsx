'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { savePromo } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
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
import { type PromoStepInput, promoStepSchema } from '@/lib/validation/mindsetter';

type PromoFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved `promo_video` jsonb, when the caller revisits this block. A legacy row may
   * still carry a `videoPath` from the removed upload flow — it is simply ignored here. */
  initialPromoVideo?: {
    youtube?: string | null;
    vimeo?: string | null;
  } | null;
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

/**
 * Optional block "Promo video" (onboarding doc section 7) — LINK ONLY.
 *
 * Direct upload was removed on 2026-08-05 (product decision). It previously pushed an MP4/MOV
 * of up to 200 MB client-side into a private Storage bucket, which dragged along a signed-URL
 * round trip on every render and a best-effort orphan sweep to stop unreferenced 200 MB files
 * accumulating. Dropping it deletes that whole surface: no bucket writes, no object URLs to
 * revoke, no per-render signing.
 *
 * Structurally this is now the same form as `VideoBlogForm.tsx` — two optional, host-validated
 * URL fields — but they save to different columns via different actions.
 */
export function PromoForm({ initialPromoVideo, nextHref, editMode }: PromoFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();

  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<PromoStepInput> = useForm<PromoStepInput>({
    resolver: zodResolver(promoStepSchema),
    mode: 'onChange',
    defaultValues: {
      youtube: initialPromoVideo?.youtube ?? '',
      vimeo: initialPromoVideo?.vimeo ?? '',
    },
  });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19), but
  // only in cabinet mode — this form is also the wizard's own step, which must stay unaffected by
  // the cabinet's exit guard (see that hook's own doc comment).
  useSectionDirtyGuard(editMode ? form.formState.isDirty : false);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await savePromo(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    if (editMode) {
      form.reset(values);
      notifySaved(nextHref);
      return;
    }

    router.push(nextHref);
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
            name="youtube"
            render={({ field }) => (
              <FormItem>
                <FormLabel variant="boldSpacing" className="mb-1">
                  {t('blocks.promo.youtubeLabel')}
                </FormLabel>
                <FormControl>
                  <Input type="url" placeholder={t('blocks.promo.linkPlaceholder')} {...field} />
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
                <FormLabel variant="boldSpacing" className="mb-1">
                  {t('blocks.promo.vimeoLabel')}
                </FormLabel>
                <FormControl>
                  <Input type="url" placeholder={t('blocks.promo.linkPlaceholder')} {...field} />
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
