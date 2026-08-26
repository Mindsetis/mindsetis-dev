'use client';

import { arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import {
  deleteReelLifePhoto,
  saveReelLife,
  uploadReelLifePhoto,
} from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { SortableList } from '@/components/mindsetter-onboarding/SortableList';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldHint } from '@/components/ui/field-hint';
import { ImageOptimizeHint } from '@/components/ui/image-optimize-hint';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ACCEPTED_REEL_LIFE_MIME_TYPES,
  MAX_REEL_LIFE_PHOTO_SIZE_BYTES,
  MAX_REEL_LIFE_PHOTOS,
  MIN_REEL_LIFE_PHOTOS_TO_DISPLAY,
} from '@/lib/validation/mindsetter';

const ACCEPT_ATTR = ACCEPTED_REEL_LIFE_MIME_TYPES.join(',');

/**
 * Upload-photo dropzone icon — provided verbatim by the designer, hardcoded fill (not
 * `currentColor`). Drawn at 26×26 rather than its native 46×46 since this box was restyled to
 * match the profile-photo dropzone (2026-08-11), whose glyph is 26 — the two sit at the same
 * scale now. The `viewBox` is unchanged, so the artwork just scales.
 */
function UploadPhotoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <path
        d="M25.8737 11.4997C24.3404 11.4997 22.9987 12.8413 22.9987 14.3747C22.9987 15.908 24.3404 17.2497 25.8737 17.2497C27.407 17.2497 28.7487 15.908 28.7487 14.3747C28.7487 12.8413 27.407 11.4997 25.8737 11.4997ZM36.4154 3.83301H9.58203C6.3237 3.83301 3.83203 6.32467 3.83203 9.58301V36.4163C3.83203 39.6747 6.3237 42.1663 9.58203 42.1663H36.4154C39.6737 42.1663 42.1654 39.6747 42.1654 36.4163V9.58301C42.1654 6.32467 39.6737 3.83301 36.4154 3.83301ZM38.332 26.6413L34.6904 22.9997C32.3904 20.8913 28.7487 20.8913 26.6404 22.9997L24.9154 24.7247L19.357 19.1663C17.057 17.058 13.4154 17.058 11.307 19.1663L7.66536 22.808V9.58301C7.66536 8.43301 8.43203 7.66634 9.58203 7.66634H36.4154C37.5654 7.66634 38.332 8.43301 38.332 9.58301V26.6413Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** Per-tile drag-handle icon — designer artwork on a 12-unit grid, rendered at 16×16
 * (2026-08-11). Hardcoded fill, not `currentColor`. */
function PhotoDragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M4.95149 3.85714H10.7251C11.04 3.85714 11.25 3.64286 11.25 3.32143C11.25 3 11.04 2.78571 10.7251 2.78571H4.95149C4.63657 2.78571 4.42662 3 4.42662 3.32143C4.42662 3.64286 4.63657 3.85714 4.95149 3.85714ZM2.69453 7.76786V4.23214C2.7995 4.33929 2.90448 4.39286 3.00945 4.39286C3.16691 4.39286 3.27189 4.33929 3.37686 4.28571C3.58681 4.07143 3.6393 3.75 3.42935 3.53571L2.53706 2.46429C2.43209 2.30357 2.32711 2.25 2.16965 2.25C2.01219 2.25 1.85473 2.30357 1.74975 2.46429L0.857462 3.53571C0.699999 3.75 0.699999 4.07143 0.962437 4.28571C1.17239 4.44643 1.43482 4.44643 1.64478 4.28571V7.82143C1.43482 7.66071 1.17239 7.60714 0.962437 7.82143C0.752487 8.03571 0.699999 8.35714 0.909949 8.57143L1.80224 9.64286C1.85473 9.69643 2.01219 9.75 2.16965 9.75C2.32711 9.75 2.48458 9.69643 2.58955 9.53571L3.48184 8.46429C3.69179 8.25 3.6393 7.875 3.42935 7.71429C3.16691 7.55357 2.85199 7.55357 2.69453 7.76786ZM10.7251 5.46429H4.95149C4.63657 5.46429 4.42662 5.67857 4.42662 6C4.42662 6.32143 4.63657 6.53571 4.95149 6.53571H10.7251C11.04 6.53571 11.25 6.32143 11.25 6C11.25 5.67857 11.04 5.46429 10.7251 5.46429ZM10.7251 8.14286H4.95149C4.63657 8.14286 4.42662 8.35714 4.42662 8.67857C4.42662 9 4.63657 9.21429 4.95149 9.21429H10.7251C11.04 9.21429 11.25 9 11.25 8.67857C11.25 8.35714 11.04 8.14286 10.7251 8.14286Z"
        fill="white"
      />
    </svg>
  );
}

/** Per-tile delete icon — designer artwork on a 12-unit grid, rendered at 16×16 (2026-08-11).
 * Hardcoded fill, not `currentColor`. */
function PhotoDeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M8.5 2H10.5C10.7761 2 11 2.22386 11 2.5C11 2.77614 10.7761 3 10.5 3H10V10.5C10 10.7762 9.77615 11 9.5 11H2.5C2.22386 11 2 10.7762 2 10.5V3H1.5C1.22386 3 1 2.77614 1 2.5C1 2.22386 1.22386 2 1.5 2H3.5C3.5 1.44772 3.94772 1 4.5 1H7.5C8.05228 1 8.5 1.44772 8.5 2ZM5 4.5C4.72386 4.5 4.5 4.72386 4.5 5V8C4.5 8.27614 4.72386 8.5 5 8.5C5.27614 8.5 5.5 8.27614 5.5 8V5C5.5 4.72386 5.27614 4.5 5 4.5ZM7 4.5C6.72386 4.5 6.5 4.72386 6.5 5V8C6.5 8.27614 6.72386 8.5 7 8.5C7.27614 8.5 7.5 8.27614 7.5 8V5C7.5 4.72386 7.27614 4.5 7 4.5Z"
        fill="#FF4C58"
      />
    </svg>
  );
}

/** Icon above the "Add Photo" tile (16×16) — provided verbatim by the designer, hardcoded fill
 * (not `currentColor`). */
function AddPhotoPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.33203 7.33398V4.00065C7.33203 3.63246 7.63051 3.33398 7.9987 3.33398C8.36689 3.33398 8.66536 3.63246 8.66536 4.00065V7.33398H11.9987C12.3669 7.33398 12.6654 7.63246 12.6654 8.00065C12.6654 8.36884 12.3669 8.66732 11.9987 8.66732H8.66536V12.0007C8.66536 12.3688 8.36689 12.6673 7.9987 12.6673C7.63051 12.6673 7.33203 12.3688 7.33203 12.0007V8.66732H3.9987C3.63051 8.66732 3.33203 8.36884 3.33203 8.00065C3.33203 7.63246 3.63051 7.33398 3.9987 7.33398H7.33203Z"
        fill="white"
      />
    </svg>
  );
}

/** Icon to the left of the "Hold and drag to change order" hint (16×16) — provided verbatim by
 * the designer, hardcoded fill (not `currentColor`). */
function ReorderHintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.60199 5.14286H14.3002C14.7201 5.14286 15 4.85714 15 4.42857C15 4 14.7201 3.71429 14.3002 3.71429H6.60199C6.18209 3.71429 5.90215 4 5.90215 4.42857C5.90215 4.85714 6.18209 5.14286 6.60199 5.14286ZM3.5927 10.3571V5.64286C3.73267 5.78571 3.87264 5.85714 4.0126 5.85714C4.22255 5.85714 4.36252 5.78571 4.50249 5.71429C4.78242 5.42857 4.8524 5 4.57247 4.71429L3.38275 3.28571C3.24278 3.07143 3.10282 3 2.89287 3C2.68292 3 2.47297 3.07143 2.333 3.28571L1.14328 4.71429C0.933332 5 0.933332 5.42857 1.28325 5.71429C1.56318 5.92857 1.9131 5.92857 2.19303 5.71429V10.4286C1.9131 10.2143 1.56318 10.1429 1.28325 10.4286C1.00332 10.7143 0.933332 11.1429 1.21327 11.4286L2.40298 12.8571C2.47297 12.9286 2.68292 13 2.89287 13C3.10282 13 3.31277 12.9286 3.45274 12.7143L4.64245 11.2857C4.92239 11 4.8524 10.5 4.57247 10.2857C4.22255 10.0714 3.80265 10.0714 3.5927 10.3571ZM14.3002 7.28571H6.60199C6.18209 7.28571 5.90215 7.57143 5.90215 8C5.90215 8.42857 6.18209 8.71429 6.60199 8.71429H14.3002C14.7201 8.71429 15 8.42857 15 8C15 7.57143 14.7201 7.28571 14.3002 7.28571ZM14.3002 10.8571H6.60199C6.18209 10.8571 5.90215 11.1429 5.90215 11.5714C5.90215 12 6.18209 12.2857 6.60199 12.2857H14.3002C14.7201 12.2857 15 12 15 11.5714C15 11.1429 14.7201 10.8571 14.3002 10.8571Z"
        fill="white"
      />
    </svg>
  );
}

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
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Cancel" + "Save changes".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
};

function createTileId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** One photo tile in the Reel Life grid — a `@dnd-kit` sortable item. The whole tile is the
 * moving element (transform/transition), the top-right grip is the drag handle (mouse/touch/
 * keyboard via `SortableList`'s sensors). An uploading tile isn't draggable yet (no path saved). */
function PhotoTile({
  item,
  onRemove,
  removeLabel,
  reorderLabel,
}: {
  item: ReelLifeItem;
  onRemove: () => void;
  removeLabel: string;
  reorderLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.status !== 'ready',
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    // The WHOLE tile is the drag handle (2026-08-11) — grabbing anywhere picks the photo up, not
    // just the small grip. Safe for the delete button nested inside: `SortableList`'s
    // `PointerSensor` only activates past 6px of movement, so a plain click still reaches the
    // button, and its `TouchSensor` needs a 200ms hold, so a finger swipe still scrolls the page.
    // Deliberately NO `touch-none` here (the grip had it): that would kill page scrolling that
    // starts on a photo, which now means most of the grid.
    <div
      ref={setNodeRef}
      style={style}
      aria-label={reorderLabel}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-[12px] border border-border bg-card',
        item.status === 'ready' && 'cursor-grab active:cursor-grabbing',
        isDragging && 'z-10',
      )}
    >
      {item.status === 'uploading' ? (
        // Local object-URL preview of a not-yet-uploaded file, not a static/remote asset Next can
        // optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.previewUrl} alt="" className="size-full object-cover opacity-50" />
      ) : (
        // Server-signed private-bucket URL (short-lived, per-request), not a static/remote asset
        // Next can optimize/cache.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" className="size-full object-cover" />
      )}

      {item.status === 'uploading' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="size-6 animate-spin text-white" aria-hidden="true" />
        </div>
      ) : (
        <>
          {/* Purely a visual affordance now — the listeners moved to the tile root above, so this
              only signals "draggable" rather than being the one place you can grab. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 flex items-center justify-center"
          >
            <PhotoDragHandleIcon />
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="absolute right-3 bottom-3 flex cursor-pointer items-center justify-center"
          >
            <PhotoDeleteIcon />
          </button>
        </>
      )}
    </div>
  );
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
 * Reordering: `@dnd-kit` (`SortableList` + `PhotoTile`'s `useSortable`), grid strategy — works on
 * mouse, touch AND keyboard. Replaced the previous native HTML5 drag-and-drop, which fired on
 * mouse only and was dead on touch (so phones couldn't reorder at all).
 */
export function ReelLifeForm({ initialPhotos, nextHref, editMode }: ReelLifeFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const notifySaved = useCabinetSaved();

  /** The saved photo list as tiles — the state this form starts from, and what Cancel restores. */
  const initialItems = (): ReelLifeItem[] =>
    initialPhotos.map((photo) => ({
      id: photo.path,
      status: 'ready',
      path: photo.path,
      url: photo.url,
    }));

  const [items, setItems] = useState<ReelLifeItem[]>(initialItems);
  /** The tile list "Cancel" restores. Starts at what the page loaded and moves forward on every
   * successful cabinet save, since the component no longer remounts with fresh props after one. */
  const savedItems = useRef<ReelLifeItem[]>(items);
  const [fileError, setFileError] = useState<string | null>(null);
  /** Size errors get the "optimize it with an AI" prompt; a wrong file type has nothing to
   * compress, so it doesn't. */
  const [fileErrorIsSize, setFileErrorIsSize] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  /**
   * Cabinet mode only: Storage paths whose tiles were removed in this editing session, held back
   * until the save actually succeeds (see `removeItem`). A ref, not state — nothing renders from
   * it, and it must survive re-renders without causing one.
   */
  const pendingDeletions = useRef<string[]>([]);

  const isUploading = items.some((item) => item.status === 'uploading');
  const canAddMore = items.length < MAX_REEL_LIFE_PHOTOS;
  const readyCount = items.filter((item) => item.status === 'ready').length;
  // The step is SKIPPABLE (2026-08-05 product decision): "Save and continue" is always
  // rendered, including with zero photos. It used to appear only past a three-photo
  // threshold, which left anyone with fewer photos no way forward and no way to skip.
  // `reelLifeStepSchema` already accepts an empty array, so nothing server-side objects.
  const showRecommendation = readyCount < MIN_REEL_LIFE_PHOTOS_TO_DISPLAY;
  // Dragging is only a meaningful affordance once there are two tiles to swap.
  const showReorderHint = readyCount >= 2;

  function replaceItem(id: string, next: ReelLifeItem) {
    setItems((previous) => previous.map((item) => (item.id === id ? next : item)));
  }

  function removeItem(id: string) {
    setItems((previous) => {
      const target = previous.find((item) => item.id === id);
      if (target?.status === 'ready') {
        if (editMode) {
          // CABINET: defer the Storage delete until the save succeeds. Firing it here would make
          // "Cancel" destroy the photo anyway — the exact opposite of what that button promises,
          // and unrecoverable (verified: the object was gone from Storage while `reel_life` still
          // listed its path, leaving a dangling entry the profile page silently drops).
          pendingDeletions.current.push(target.path);
        } else {
          // WIZARD (unchanged): best-effort immediate cleanup — see `deleteReelLifePhoto`'s own
          // doc comment for why this isn't awaited or blocking: the ordered path list saved via
          // `saveReelLife` is the real source of truth, this just tidies up the orphaned object.
          void deleteReelLifePhoto({ path: target.path });
        }
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
        setFileErrorIsSize(false);
        continue;
      }
      if (file.size > MAX_REEL_LIFE_PHOTO_SIZE_BYTES) {
        setFileError(t('blocks.reelLife.errors.tooLarge'));
        setFileErrorIsSize(true);
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

  function handleReorder(fromIndex: number, toIndex: number) {
    setItems((previous) => arrayMove(previous, fromIndex, toIndex));
  }

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);

    const reelLife = items
      .filter((item): item is Extract<ReelLifeItem, { status: 'ready' }> => item.status === 'ready')
      .map((item) => item.path);

    const result = await saveReelLife({ reelLife });

    if (!result.ok) {
      setSubmitting(false);
      setFormError(result.error.message);
      return;
    }

    // Only now that the new path list is persisted are the removed objects safe to delete — had
    // the save failed, those tiles are still listed in `reel_life` and must keep their files.
    //
    // AWAITED, not fire-and-forget: in the wizard `router.push` below unmounts this component
    // immediately, which aborts still-in-flight Server Action requests — verified, the object
    // outlived a save that had already emptied `reel_life`. `allSettled` keeps this best-effort:
    // a delete that fails leaves a recoverable orphan and must not block the exit.
    // No-ops in the wizard, where `pendingDeletions` is always empty.
    await Promise.allSettled(pendingDeletions.current.map((path) => deleteReelLifePhoto({ path })));
    pendingDeletions.current = [];

    setSubmitting(false);

    if (editMode) {
      // Stay on the section. The tiles on screen ARE the saved state now, so they become the new
      // baseline that "Cancel" restores — the page doesn't remount with fresh props any more.
      savedItems.current = items;
      notifySaved();
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
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
          {fileErrorIsSize ? (
            <ImageOptimizeHint maxSizeMb={MAX_REEL_LIFE_PHOTO_SIZE_BYTES / (1024 * 1024)} />
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        // Same dropzone treatment as the profile-photo field (`AvatarUpload`): dashed #747474
        // edge, 14px radius, black fill, 28/24 padding, 8px gaps, 16px headline over a 14px
        // muted hint. It also takes a dropped file now, which the dashed border always implied.
        // `[&>*]:pointer-events-none` keeps drag events off the icon/labels — without it,
        // dragging across a child fires `dragleave` on the button and the highlight flickers.
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            // The whole FileList, not just the first entry — this section takes several photos,
            // and `handleFiles` already applies the per-file type/size rules and the max count.
            void handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-dashed border-[#747474] bg-background px-6 py-7 text-center transition-colors hover:border-primary [&>*]:pointer-events-none',
            isDragging && 'border-primary',
          )}
        >
          <UploadPhotoIcon />
          <span className="text-base text-foreground">{t('blocks.reelLife.uploadLabel')}</span>
          <span className="text-tiny text-muted-foreground">
            {t.rich('blocks.reelLife.uploadHint', {
              br: () => <br className="hidden md:inline" />,
            })}
          </span>
        </button>
      ) : (
        <div>
          {showReorderHint ? (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-[#747474] bg-[#1a1a1a] p-4 md:mb-6">
              <ReorderHintIcon />
              <span className="text-tiny text-white">{t('blocks.reelLife.reorderHint')}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
            <SortableList
              ids={items.map((item) => item.id)}
              onReorder={handleReorder}
              layout="grid"
            >
              {items.map((item) => (
                <PhotoTile
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  removeLabel={t('blocks.reelLife.removePhoto')}
                  reorderLabel={t('common.reorder')}
                />
              ))}
            </SortableList>

            {canAddMore ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed border-border transition-colors hover:border-foreground/40"
              >
                <AddPhotoPlusIcon />
                <span className="text-tiny font-bold text-white">
                  {t('blocks.reelLife.addPhoto')}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* The empty state used to carry a `mt-[-14px]` pull-up on this hint, tuned for the old
          200/400px box; the restyled dropzone is much shorter, so the container's own gap is the
          right spacing again and the override is gone. */}
      {showRecommendation ? (
        <FieldHint centerIcon>
          {t('blocks.reelLife.recommendedHint', { count: MIN_REEL_LIFE_PHOTOS_TO_DISPLAY })}
        </FieldHint>
      ) : null}

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

      <StepActions
        editMode={editMode}
        isSubmitting={submitting}
        // Only an in-flight upload blocks it — waiting avoids saving a path list that is
        // still missing the tile being uploaded. Zero photos is a valid submission.
        disabled={isUploading}
        onSubmit={() => void handleSubmit()}
        onCancel={() => {
          // This form keeps its tiles in local state, not RHF, so the revert is manual: restore
          // the saved tiles and drop the queued deletions (nothing was deleted from Storage yet
          // — `removeItem` only queues in cabinet mode, precisely so Cancel can undo it).
          //
          // Photos UPLOADED during this session are already in Storage and stay there as
          // orphans, same as before this change: they were never referenced by `reel_life`, so
          // nothing user-visible survives the revert.
          setItems(savedItems.current);
          pendingDeletions.current = [];
          setFormError(null);
          setFileError(null);
        }}
      />
    </div>
  );
}
