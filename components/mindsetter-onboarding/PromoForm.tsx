'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import {
  deletePromoThumbnail,
  savePromo,
  uploadPromoThumbnail,
} from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyActionFailure } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { FieldHint } from '@/components/ui/field-hint';
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
import { ImageOptimizeHint } from '@/components/ui/image-optimize-hint';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import type { PromoThumbnailPreview } from '@/lib/profile/promo-thumbnail';
import {
  ACCEPTED_PROMO_THUMBNAIL_MIME_TYPES,
  MAX_PROMO_THUMBNAIL_SIZE_BYTES,
  type PromoStepInput,
  promoStepSchema,
} from '@/lib/validation/mindsetter';

const THUMBNAIL_ACCEPT_ATTR = ACCEPTED_PROMO_THUMBNAIL_MIME_TYPES.join(',');

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
  /** The saved custom thumbnail with a fresh signed preview URL (null = none). */
  initialThumbnail?: PromoThumbnailPreview | null;
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
export function PromoForm({
  initialPromoVideo,
  initialThumbnail,
  nextHref,
  editMode,
}: PromoFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  /** Which control should take focus once the next render swaps the upload button and the preview. */
  const pendingFocus = useRef<'remove' | 'upload' | null>(null);
  const isMounted = useRef(true);
  const baseId = useId();
  const thumbnailLabelId = `${baseId}-thumb-label`;
  const thumbnailHintId = `${baseId}-thumb-hint`;
  const thumbnailActionId = `${baseId}-thumb-action`;

  const [formError, setFormError] = useState<FormBanner>(null);
  /** The thumbnail currently shown — the saved one, or one just uploaded and not yet saved. */
  const [thumbnail, setThumbnail] = useState<PromoThumbnailPreview | null>(
    initialThumbnail ?? null,
  );
  /** Path persisted in `promo_video` right now. Never deleted from here: `savePromo` removes it
   * itself once a replacement/clear is saved, so "Cancel" can't destroy a live cover. */
  const [savedThumbnailPath, setSavedThumbnailPath] = useState(initialThumbnail?.path ?? '');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  /** Size errors get the "optimize it with an AI" prompt; a wrong type has nothing to compress. */
  const [thumbnailErrorIsSize, setThumbnailErrorIsSize] = useState(false);

  const form: UseFormReturn<PromoStepInput> = useForm<PromoStepInput>({
    // `revealOnInvalid` focuses the first error in page order; RHF's own focus would fight it.
    shouldFocusError: false,
    resolver: zodResolver(promoStepSchema),
    mode: 'onChange',
    defaultValues: {
      youtube: initialPromoVideo?.youtube ?? '',
      vimeo: initialPromoVideo?.vimeo ?? '',
      thumbnailPath: initialThumbnail?.path ?? '',
    },
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // The upload button and the preview's Remove button replace each other, so focus would otherwise
  // fall back to <body> — hand it to the control that took over.
  useEffect(() => {
    if (pendingFocus.current === 'remove') removeButtonRef.current?.focus();
    if (pendingFocus.current === 'upload') uploadButtonRef.current?.focus();
    pendingFocus.current = null;
  }, [thumbnail]);

  /** Best-effort delete of an uploaded-but-unsaved thumbnail that is being replaced or removed. */
  function discardUnsaved(path: string | undefined) {
    if (path && path !== savedThumbnailPath) void deletePromoThumbnail({ path });
  }

  async function handleThumbnailFile(file: File | null) {
    if (!file) return;
    setThumbnailError(null);

    if (!(ACCEPTED_PROMO_THUMBNAIL_MIME_TYPES as readonly string[]).includes(file.type)) {
      setThumbnailError(t('blocks.promo.errors.thumbnailInvalidType'));
      setThumbnailErrorIsSize(false);
      return;
    }
    if (file.size > MAX_PROMO_THUMBNAIL_SIZE_BYTES) {
      setThumbnailError(t('blocks.promo.errors.thumbnailTooLarge'));
      setThumbnailErrorIsSize(true);
      return;
    }

    setIsUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('thumbnail', file);
    const result = await uploadPromoThumbnail(formData);
    // Resolved after the form was left: no state writes on an unmounted component (the new object
    // stays an orphan, like any abandoned upload).
    if (!isMounted.current) return;
    setIsUploadingThumbnail(false);

    if (!result.ok) {
      // The server sniffs the real file type; a renamed non-image is a type problem, not an outage.
      setThumbnailError(
        result.error.code === 'validation_error'
          ? t('blocks.promo.errors.thumbnailInvalidType')
          : t('blocks.promo.errors.thumbnailUploadFailed'),
      );
      setThumbnailErrorIsSize(false);
      return;
    }

    discardUnsaved(thumbnail?.path);
    pendingFocus.current = 'remove';
    setThumbnail({ path: result.data.path, url: result.data.url });
    form.setValue('thumbnailPath', result.data.path, { shouldDirty: true });
  }

  function removeThumbnail() {
    setThumbnailError(null);
    discardUnsaved(thumbnail?.path);
    pendingFocus.current = 'upload';
    setThumbnail(null);
    form.setValue('thumbnailPath', '', { shouldDirty: true });
  }

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19) in
  // both modes: since 2026-09-29 the wizard has a bottom "Back" of its own, which should ask
  // before dropping an edited step just like the cabinet's (see that hook's own doc comment).
  useSectionDirtyGuard(form.formState.isDirty);

  const onSubmit = form.handleSubmit(async (values, event) => {
    // Enter in a URL input submits even though Save is disabled mid-upload; saving now would drop
    // the thumbnail that is still on its way.
    if (isUploadingThumbnail) return;
    setFormError(null);

    const result = await savePromo(values);
    if (!result.ok) {
      setFormError(applyActionFailure(form, result.error, event));
      return;
    }

    setSavedThumbnailPath(values.thumbnailPath ?? '');

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
                <FormLabel variant="boldSpacing" className="mb-1">
                  {t('blocks.promo.youtubeLabel')}
                </FormLabel>
                <FormControl>
                  <Input type="url" placeholder={t('blocks.promo.youtubePlaceholder')} {...field} />
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
                  <Input type="url" placeholder={t('blocks.promo.vimeoPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Optional custom cover. Uploaded the moment it is picked (like Reel Life photos); only
            the resulting path rides along with the form submit. */}
        <div className="flex flex-col gap-2">
          <Label id={thumbnailLabelId} variant="boldSpacing" className="mb-1">
            {t('blocks.promo.thumbnailLabel')}
          </Label>

          <div aria-live="polite">
            {thumbnailError ? (
              <div className="flex flex-col gap-3">
                <FormErrorAlert messages={thumbnailError} />
                {thumbnailErrorIsSize ? (
                  <ImageOptimizeHint maxSizeMb={MAX_PROMO_THUMBNAIL_SIZE_BYTES / (1024 * 1024)} />
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="sr-only" aria-live="polite">
            {isUploadingThumbnail ? t('blocks.promo.thumbnailUploading') : ''}
          </p>

          {thumbnail ? (
            <div
              role="group"
              aria-labelledby={thumbnailLabelId}
              aria-describedby={thumbnailHintId}
              className="flex flex-col items-start gap-2"
            >
              {/* Plain <img>: a signed Storage URL isn't in next/image's remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail.url}
                alt={t('blocks.promo.thumbnailAlt')}
                className="aspect-video w-full max-w-[320px] rounded-xl border border-border object-cover"
              />
              <button
                ref={removeButtonRef}
                type="button"
                onClick={removeThumbnail}
                className="inline-flex cursor-pointer items-center gap-1.5 text-tiny font-bold text-primary transition-colors hover:text-primary-hover"
              >
                <X className="size-4" aria-hidden="true" />
                {t('blocks.promo.thumbnailRemove')}
              </button>
            </div>
          ) : (
            <button
              ref={uploadButtonRef}
              type="button"
              disabled={isUploadingThumbnail}
              aria-labelledby={`${thumbnailLabelId} ${thumbnailActionId}`}
              aria-describedby={thumbnailHintId}
              onClick={() => thumbnailInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-dashed border-[#747474] bg-background px-6 py-7 text-center transition-colors hover:border-primary disabled:cursor-wait disabled:opacity-70"
            >
              {isUploadingThumbnail ? (
                <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-6 text-primary" aria-hidden="true" />
              )}
              <span id={thumbnailActionId} className="text-base text-foreground">
                {isUploadingThumbnail
                  ? t('blocks.promo.thumbnailUploading')
                  : t('blocks.promo.thumbnailUpload')}
              </span>
              <span className="text-tiny text-muted-foreground">
                {t('blocks.promo.thumbnailSpecs')}
              </span>
            </button>
          )}

          <FieldHint id={thumbnailHintId}>{t('blocks.promo.thumbnailHint')}</FieldHint>

          <input
            ref={thumbnailInputRef}
            type="file"
            accept={THUMBNAIL_ACCEPT_ATTR}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              void handleThumbnailFile(event.target.files?.[0] ?? null);
              // Reset so picking the same file again still fires `onChange`.
              event.target.value = '';
            }}
          />
        </div>

        <StepActions
          onCancel={() => router.push('/dashboard/profile')}
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
          disabled={isUploadingThumbnail}
        />
      </form>
    </Form>
  );
}
