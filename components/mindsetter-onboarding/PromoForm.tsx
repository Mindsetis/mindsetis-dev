'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { savePromo } from '@/app/[locale]/mindsetter-onboarding/actions';
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
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/browser';
import {
  ACCEPTED_PROMO_VIDEO_MIME_TYPES,
  MAX_PROMO_VIDEO_SIZE_BYTES,
  type PromoStepInput,
  promoStepSchema,
} from '@/lib/validation/mindsetter';

const ACCEPT_ATTR = ACCEPTED_PROMO_VIDEO_MIME_TYPES.join(',');
const PROMO_VIDEO_BUCKET = 'promo-video';

type PromoFormProps = {
  /** Already-saved `promo_video` jsonb, when the caller revisits this block. */
  initialPromoVideo?: {
    youtube?: string | null;
    vimeo?: string | null;
    videoPath?: string | null;
  } | null;
  /** Already-uploaded video's Storage object path (`''` if none) — the RHF `videoPath` field's
   * initial value; re-validated owner-scoped in `savePromo`. */
  initialVideoPath: string;
  /** A freshly-minted signed URL for `initialVideoPath` (private bucket), or `null` — resolved by
   * the page so a revisiting caller sees their previously-uploaded video. */
  initialVideoUrl: string | null;
  /** The signed-in caller's id — used to build the owner-scoped upload path (`<uid>/promo-...`);
   * Storage RLS re-enforces the same folder, this just builds the key. */
  userId: string;
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

/** Upload-video dropzone icon (46×46) — provided verbatim by the designer, hardcoded fill (not
 * `currentColor`). */
function UploadVideoIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <path
        d="M21.5858 6.37027C22.3668 5.58922 23.6332 5.58922 24.4142 6.37027L33.5417 15.4977C34.2902 16.2462 34.2902 17.4598 33.5417 18.2083C32.7932 18.9567 31.5796 18.9567 30.8311 18.2083L24.9167 12.2939L24.9167 28.7499C24.9167 29.8084 24.0585 30.6666 23 30.6666C21.9415 30.6666 21.0833 29.8084 21.0833 28.7499L21.0833 12.2939L15.1689 18.2083C14.4204 18.9567 13.2069 18.9568 12.4584 18.2083C11.7098 17.4598 11.7098 16.2462 12.4583 15.4977L21.5858 6.37027ZM5.75 34.4999L5.75 28.7499C5.75 27.6913 6.60812 26.8332 7.66667 26.8332C8.72521 26.8332 9.58333 27.6914 9.58333 28.7499V34.4999C9.58333 35.5585 10.4415 36.4166 11.5 36.4166H34.5C35.5586 36.4166 36.4167 35.5585 36.4167 34.4999V28.7499C36.4167 27.6913 37.2748 26.8332 38.3333 26.8332C39.3919 26.8332 40.25 27.6914 40.25 28.7499L40.25 34.4999C40.25 37.6756 37.6757 40.2499 34.5 40.2499H11.5C8.32437 40.2499 5.75 37.6756 5.75 34.4999Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** What's currently shown in the video box — either a just-uploaded local object URL (must be
 * revoked) or a server-minted signed URL for an already-saved video (must NOT be revoked). */
type VideoPreview = { url: string; isObjectUrl: boolean };

/**
 * Optional block "Promo video" (onboarding doc section 7). Direct video upload is now enabled
 * (product follow-up, 2026-07-19): the caller can upload an MP4/MOV file (≤200 MB) OR paste a
 * YouTube/Vimeo URL — all optional.
 *
 * The video file is uploaded CLIENT-SIDE straight into the private `promo-video` Storage bucket
 * via the browser Supabase client (owner-scoped RLS confines it to the caller's own `<uid>/`
 * folder) — a 200 MB file can't go through a Server Action (Next's ~1 MB action-body / Vercel's
 * 4.5 MB serverless body limits), unlike Reel Life's 10 MB photos. Only the resulting object path
 * is then submitted to `savePromo` (which re-checks the `<uid>/` prefix). The just-uploaded video
 * previews from a local object URL (no re-download of the 200 MB file); a revisit previews from a
 * server-minted signed URL (`initialVideoUrl`, private bucket).
 */
export function PromoForm({
  initialPromoVideo,
  initialVideoPath,
  initialVideoUrl,
  userId,
  nextHref,
}: PromoFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<VideoPreview | null>(
    initialVideoUrl ? { url: initialVideoUrl, isObjectUrl: false } : null,
  );

  const form: UseFormReturn<PromoStepInput> = useForm<PromoStepInput>({
    resolver: zodResolver(promoStepSchema),
    mode: 'onChange',
    defaultValues: {
      youtube: initialPromoVideo?.youtube ?? '',
      vimeo: initialPromoVideo?.vimeo ?? '',
      videoPath: initialVideoPath,
    },
  });

  // Revoke a lingering local object URL on unmount (a server-minted signed URL isn't ours to
  // revoke). Keyed on the current preview so a replaced one is cleaned up by its own effect run.
  useEffect(() => {
    return () => {
      if (preview?.isObjectUrl) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function setLocalPreview(next: VideoPreview | null) {
    setPreview((current) => {
      if (current?.isObjectUrl && current.url !== next?.url) {
        URL.revokeObjectURL(current.url);
      }
      return next;
    });
  }

  async function handleFile(file: File) {
    setUploadError(null);

    if (!(ACCEPTED_PROMO_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setUploadError(t('blocks.promo.errors.invalidType'));
      return;
    }
    if (file.size > MAX_PROMO_VIDEO_SIZE_BYTES) {
      setUploadError(t('blocks.promo.errors.tooLarge'));
      return;
    }

    setUploading(true);
    const extension = file.type === 'video/quicktime' ? 'mov' : 'mp4';
    const path = `${userId}/promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from(PROMO_VIDEO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[mindsetter-onboarding] promo-video upload failed:', error);
      setUploading(false);
      setUploadError(t('blocks.promo.errors.uploadFailed'));
      return;
    }

    // Promo video is a single slot — after the new upload succeeds, clear every OTHER object in
    // the caller's own folder: the previously-saved video AND any orphans left by an earlier
    // upload the caller never saved (its path was only ever in local form state, lost on
    // navigate-away). Keeps the folder to exactly one video so it can't accumulate unreferenced
    // 200 MB files (security-review follow-up, 2026-07-19). Done AFTER the upload (never before)
    // so a failed upload doesn't destroy the existing video. Best-effort, owner-scoped by RLS.
    const { data: existing } = await supabase.storage.from(PROMO_VIDEO_BUCKET).list(userId);
    const stale = (existing ?? [])
      .map((object) => `${userId}/${object.name}`)
      .filter((objectPath) => objectPath !== path);
    if (stale.length > 0) {
      void supabase.storage.from(PROMO_VIDEO_BUCKET).remove(stale);
    }

    setLocalPreview({ url: URL.createObjectURL(file), isObjectUrl: true });
    form.setValue('videoPath', path, { shouldDirty: true });
    setUploading(false);
  }

  function handleRemove() {
    const path = form.getValues('videoPath');
    if (path) {
      void supabase.storage.from(PROMO_VIDEO_BUCKET).remove([path]);
    }
    setLocalPreview(null);
    form.setValue('videoPath', '', { shouldDirty: true });
    setUploadError(null);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await savePromo(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
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
        {uploadError ? (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        ) : null}

        {preview ? (
          <div className="relative h-[200px] overflow-hidden rounded-[16px] bg-[#1a1a1a] md:h-[400px]">
            <video src={preview.url} controls className="size-full object-contain" />
            <button
              type="button"
              onClick={handleRemove}
              aria-label={t('blocks.promo.removeVideo')}
              className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-[16px] bg-[#1a1a1a] px-6 text-center disabled:cursor-not-allowed md:h-[400px]"
          >
            {uploading ? (
              <>
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
                <p className="mt-4 text-base font-bold text-white">{t('blocks.promo.uploading')}</p>
              </>
            ) : (
              <>
                <UploadVideoIcon />
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-base font-bold text-white">{t('blocks.promo.uploadLabel')}</p>
                  <p className="text-tiny text-muted-foreground">
                    {t.rich('blocks.promo.uploadHint', { br: () => <br /> })}
                  </p>
                </div>
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            // Reset so re-picking the exact same file still fires `onChange`.
            event.target.value = '';
          }}
        />

        <div className="my-2 flex items-center gap-3 md:my-0">
          <div className="h-px flex-1 bg-border" />
          <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
            {t('blocks.promo.orDivider')}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

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

        <Button
          type="submit"
          variant="primaryOutline"
          size="lg"
          loading={form.formState.isSubmitting}
          disabled={uploading}
        >
          {form.formState.isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
      </form>
    </Form>
  );
}
