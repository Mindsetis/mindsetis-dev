'use client';

import { GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type DragEvent, useRef, useState } from 'react';

import {
  deleteReelLifePhoto,
  saveReelLife,
  uploadReelLifePhoto,
} from '@/app/[locale]/mindsetter-onboarding/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldHint } from '@/components/ui/field-hint';
import { useRouter } from '@/i18n/navigation';
import {
  ACCEPTED_REEL_LIFE_MIME_TYPES,
  MAX_REEL_LIFE_PHOTO_SIZE_BYTES,
  MAX_REEL_LIFE_PHOTOS,
} from '@/lib/validation/mindsetter';

const ACCEPT_ATTR = ACCEPTED_REEL_LIFE_MIME_TYPES.join(',');

/** One grid tile — either still uploading (a local `File` + object-URL preview, no Storage path
 * yet) or fully uploaded (a real Storage `path` + a server-signed `url`). `id` is a stable
 * client-only key so React can track/reorder tiles across renders regardless of upload state. */
type ReelLifeItem =
  | { id: string; status: 'uploading'; previewUrl: string }
  | { id: string; status: 'ready'; path: string; url: string };

type ReelLifeFormProps = {
  /** Already-saved photos — path + a freshly-resolved signed URL (see the block page's own
   * `createSignedUrls` call) — when the caller revisits this block. */
  initialPhotos: { path: string; url: string }[];
  /** Where "Save and continue" navigates once saved (`nextBlockHref`). */
  nextHref: string;
};

function createTileId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Optional block "Reel Life" (onboarding doc section 7) — a private-bucket photo gallery, unlike
 * every sibling block's plain RHF card list. Each photo uploads via its own Server Action
 * (`uploadReelLifePhoto`) the moment it's picked — this mirrors `saveMemberProfile`'s real
 * avatar-upload mechanics (a Server Action writing through the authed server client, never the
 * service-role client), just invoked once per photo instead of once per submission: batching
 * every pending `File` into one `FormData` submitted at "Save and continue" would need a
 * separate marker array just to reconstruct interleaved existing/new photo ordering, whereas
 * uploading immediately means every item in `items` below is already a plain `{ path, url }` by
 * the time "Save and continue" runs, so `saveReelLife` only ever receives an ordered array of
 * strings (see `lib/validation/mindsetter.ts`'s "Reel Life" section header for the full
 * rationale).
 *
 * No `react-hook-form` here (unlike every sibling block form) — there's no per-field validation
 * to run, the only "form value" is the photo list's membership/order, and wiring File uploads +
 * drag-reordering + per-item async upload state into an RHF field array added complexity with no
 * real benefit over a small dedicated `useState`.
 *
 * Reordering: a lightweight native HTML5 drag-and-drop (`draggable` + `onDragStart`/`onDragOver`/
 * `onDrop`), not a dedicated DnD library — simplest option that still lets the STORED ORDER (the
 * `reel_life` array itself) reflect exactly what the caller dragged. // TODO: no keyboard-
 * accessible reorder fallback yet (mouse/touch drag only) — revisit if this needs to be fully
 * accessible past MVP.
 */
export function ReelLifeForm({ initialPhotos, nextHref }: ReelLifeFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const [items, setItems] = useState<ReelLifeItem[]>(() =>
    initialPhotos.map((photo) => ({
      id: photo.path,
      status: 'ready',
      path: photo.path,
      url: photo.url,
    })),
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isUploading = items.some((item) => item.status === 'uploading');
  const canAddMore = items.length < MAX_REEL_LIFE_PHOTOS;

  function replaceItem(id: string, next: ReelLifeItem) {
    setItems((previous) => previous.map((item) => (item.id === id ? next : item)));
  }

  function removeItem(id: string) {
    setItems((previous) => {
      const target = previous.find((item) => item.id === id);
      if (target?.status === 'ready') {
        // Best-effort — see `deleteReelLifePhoto`'s own doc comment for why this isn't awaited
        // or blocking: the ordered path list saved via `saveReelLife` is the real source of
        // truth, this just tidies up the orphaned Storage object.
        void deleteReelLifePhoto({ path: target.path });
      } else if (target?.status === 'uploading') {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((item) => item.id !== id);
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);

    const remainingSlots = Math.max(0, MAX_REEL_LIFE_PHOTOS - items.length);
    const files = Array.from(fileList).slice(0, remainingSlots);

    for (const file of files) {
      if (!(ACCEPTED_REEL_LIFE_MIME_TYPES as readonly string[]).includes(file.type)) {
        setFileError(t('blocks.reelLife.errors.invalidType'));
        continue;
      }
      if (file.size > MAX_REEL_LIFE_PHOTO_SIZE_BYTES) {
        setFileError(t('blocks.reelLife.errors.tooLarge'));
        continue;
      }

      const id = createTileId();
      const previewUrl = URL.createObjectURL(file);
      setItems((previous) => [...previous, { id, status: 'uploading', previewUrl }]);

      const formData = new FormData();
      formData.append('photo', file);

      // Deliberately sequential (not `Promise.all`) — photos must upload one at a time in pick
      // order so the resulting tile order matches the order the caller selected them in.
      const result = await uploadReelLifePhoto(formData);
      URL.revokeObjectURL(previewUrl);

      if (!result.ok) {
        setFileError(result.error.message);
        setItems((previous) => previous.filter((item) => item.id !== id));
        continue;
      }

      replaceItem(id, { id, status: 'ready', path: result.data.path, url: result.data.url });
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    const sourceIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    setItems((previous) => {
      const next = [...previous];
      const [moved] = next.splice(sourceIndex, 1);
      if (!moved) return previous;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);

    const reelLife = items
      .filter((item): item is Extract<ReelLifeItem, { status: 'ready' }> => item.status === 'ready')
      .map((item) => item.path);

    const result = await saveReelLife({ reelLife });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    router.push(nextHref);
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {fileError ? (
        <Alert variant="destructive">
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-card px-6 py-10 text-center transition-colors hover:border-foreground/40"
        >
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-base font-bold text-foreground">{t('blocks.reelLife.uploadLabel')}</p>
          <p className="text-sm text-muted-foreground">{t('blocks.reelLife.uploadHint')}</p>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable={item.status === 'ready'}
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
              className="group relative aspect-square overflow-hidden rounded-[12px] border border-border bg-card"
            >
              {item.status === 'uploading' ? (
                // Local object-URL preview of a not-yet-uploaded file, not a static/remote asset
                // Next can optimize.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="size-full object-cover opacity-50" />
              ) : (
                // Server-signed private-bucket URL (short-lived, per-request), not a static/
                // remote asset Next can optimize/cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="size-full object-cover" />
              )}

              {item.status === 'uploading' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="size-6 animate-spin text-white" aria-hidden="true" />
                </div>
              ) : (
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <span
                    className="cursor-grab rounded-full bg-black/60 p-1 text-white"
                    aria-hidden="true"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={t('blocks.reelLife.removePhoto')}
                    className="cursor-pointer rounded-full bg-black/60 p-1 text-white transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {canAddMore ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              <span className="text-tiny font-bold">{t('blocks.reelLife.addPhoto')}</span>
            </button>
          ) : null}
        </div>
      )}

      {items.length > 0 ? (
        <FieldHint centerIcon>{t('blocks.reelLife.reorderHint')}</FieldHint>
      ) : (
        <FieldHint centerIcon>{t('blocks.reelLife.activateHint')}</FieldHint>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          void handleFiles(event.target.files);
          // Reset so picking the exact same file(s) again still fires `onChange`.
          event.target.value = '';
        }}
      />

      <Button
        type="button"
        variant="primaryOutline"
        size="lg"
        loading={submitting}
        disabled={isUploading}
        onClick={() => void handleSubmit()}
      >
        {submitting ? t('common.saving') : t('common.saveAndContinue')}
      </Button>
    </div>
  );
}
