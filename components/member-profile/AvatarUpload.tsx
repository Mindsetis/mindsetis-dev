'use client';

import { useRef, useState } from 'react';

import { ImageOptimizeHint } from '@/components/ui/image-optimize-hint';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { cn } from '@/lib/utils';
import { ACCEPTED_AVATAR_MIME_TYPES, MAX_AVATAR_SIZE_BYTES } from '@/lib/validation/member-profile';

const ACCEPT_ATTR = ACCEPTED_AVATAR_MIME_TYPES.join(',');

type AvatarUploadProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Dropzone headline before a photo is picked (Figma: "Upload profile photo"). */
  triggerLabel: string;
  /** Replaces the headline once a photo exists ("Replace photo"). */
  replaceLabel: string;
  /** Second line inside the box (Figma: "JPG or PNG · square · at least 800×800"). */
  hint: string;
  /** Trailing word of the Uploaded state's hint — rendered as "2.4 MB · uploaded". */
  uploadedLabel: string;
  /**
   * This field's validation message — pass `fieldState.error?.message` straight through. Present
   * → the box switches to its Error state. Still the schema's ENCODED message (see
   * `lib/validation/messages.ts`); it is translated inside this component, since the box renders
   * it itself rather than going through `FormMessage`.
   */
  error?: string;
  disabled?: boolean;
  /**
   * The profile's already-saved `avatar_url` (editing an existing profile — see
   * `MemberProfileForm`'s `initialAvatarUrl` prop). Only its PRESENCE matters here: it puts the
   * box in its Uploaded state. The image itself isn't rendered — the mock's Uploaded state shows
   * file metadata, not a thumbnail.
   */
  initialAvatarUrl?: string | null;
};

/**
 * Upload glyph (26×26) — provided verbatim by the designer. The source hardcodes `fill="#79B9E3"`,
 * which is exactly this project's `--color-primary` token, so it's wired to `currentColor` and the
 * caller sets `text-primary` — one source of truth for that blue rather than a second literal.
 */
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M13.0001 2.81665C13.3901 2.81665 13.7584 2.97915 14.0184 3.26082L18.5684 8.13582C18.801 8.41219 18.9186 8.7674 18.8967 9.12798C18.8748 9.48857 18.7152 9.82697 18.4509 10.0732C18.1866 10.3195 17.8377 10.4547 17.4765 10.451C17.1153 10.4473 16.7693 10.3049 16.5101 10.0533L14.4084 7.84332V16.575C14.4084 16.9485 14.26 17.3067 13.9959 17.5708C13.7318 17.8349 13.3736 17.9833 13.0001 17.9833C12.6265 17.9833 12.2683 17.8349 12.0042 17.5708C11.7401 17.3067 11.5917 16.9485 11.5917 16.575V7.84332L9.49005 10.0533C9.23083 10.3049 8.88483 10.4473 8.5236 10.451C8.16237 10.4547 7.81353 10.3195 7.5492 10.0732C7.28487 9.82697 7.12528 9.48857 7.10341 9.12798C7.08155 8.7674 7.19908 8.41219 7.43172 8.13582L11.9817 3.26082C12.2417 2.97915 12.6101 2.81665 13.0001 2.81665Z" />
      <path d="M4.87489 15.4917C5.65489 15.4917 6.28322 16.12 6.28322 16.9V19.3917C6.28322 19.63 6.47822 19.825 6.71655 19.825H19.2832C19.5216 19.825 19.7166 19.63 19.7166 19.3917V16.9C19.7166 16.5265 19.8649 16.1683 20.129 15.9042C20.3932 15.6401 20.7514 15.4917 21.1249 15.4917C21.4984 15.4917 21.8566 15.6401 22.1207 15.9042C22.3848 16.1683 22.5332 16.5265 22.5332 16.9V19.3917C22.5332 20.2537 22.1908 21.0803 21.5813 21.6898C20.9718 22.2993 20.1452 22.6417 19.2832 22.6417H6.71655C5.8546 22.6417 5.02795 22.2993 4.41846 21.6898C3.80896 21.0803 3.46655 20.2537 3.46655 19.3917V16.9C3.46655 16.12 4.09489 15.4917 4.87489 15.4917Z" />
    </svg>
  );
}

/**
 * Bytes → the mock's "2.4 MB" shape. Falls back to KB below a megabyte: the mock only ever shows
 * MB, but a 40 KB avatar formatted that way reads "0.0 MB", which looks like a failed upload.
 * No GB branch — `MAX_AVATAR_SIZE_BYTES` caps this at 5 MB.
 */
function formatFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return megabytes < 1
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${megabytes.toFixed(1)} MB`;
}

/**
 * Profile-photo dropzone — the shared Figma `Upload / dropzone` component (`609:4245`), as
 * instanced at the top of the cabinet's Hero section (`613:4557`).
 *
 * The whole box is the trigger: a `<button>` wrapping a hidden native `<input type="file">`, so it
 * is one tab stop and one click target, keyboard-operable for free. It also accepts a dropped file
 * (2026-08-11), which is what the dashed border has been implying all along. The mock has no
 * drag-over state, so that borrows the hover treatment — a `border-primary` edge.
 *
 * ALL THREE OF THE COMPONENT'S STATES ARE IMPLEMENTED, exactly as drawn — the geometry, glyph and
 * layout never change between them, only the border colour and the two text lines:
 *   - Empty    — dashed #747474 border, headline + requirements line (grey).
 *   - Uploaded — solid #08d6ad border, the FILE NAME as headline, "<size> · uploaded" (green).
 *   - Error    — solid #ff4c58 border, the validation message as headline, requirements (red).
 *
 * Two deliberate departures from the mock, both because the mock's copy belongs to the generic
 * document uploader it was drawn for:
 *   - The error text comes from this field's own Zod message (`error`), not the mock's hardcoded
 *     "File is too large / Maximum size is 10 MB" — our own limit is 5 MB
 *     (`MAX_AVATAR_SIZE_BYTES`, matching the bucket), so copying that number would lie.
 *   - A profile that ALREADY has a saved photo has no filename or size to show (it's a URL, not a
 *     File), so it uses the Uploaded border with "Replace photo" as the headline and a bare
 *     "uploaded" hint. The mock has no state for that case.
 *
 * The icon keeps this instance's own `text-primary` override in every state rather than the base
 * component's white — switching it to white only on error/success would read as a second, unasked
 * signal on top of the border colour.
 *
 * The real Storage upload still happens server-side in the Server Action; this only hands the raw
 * `File` up to the form (RHF field value).
 */
export function AvatarUpload({
  file,
  onFileChange,
  triggerLabel,
  replaceLabel,
  hint,
  uploadedLabel,
  error,
  disabled,
  initialAvatarUrl,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const errorText = useValidationMessage()(error);

  const hasPhoto = Boolean(file ?? initialAvatarUrl);
  // Error wins over Uploaded: a rejected file still leaves the previous photo in place, and the
  // problem is the more useful thing to show.
  const state = error ? 'error' : hasPhoto ? 'uploaded' : 'empty';

  // Whether THIS error is the size one, decided from the file itself rather than by matching the
  // message text — the copy is translated, the byte count isn't.
  const isTooLarge = Boolean(error && file && file.size > MAX_AVATAR_SIZE_BYTES);

  // Headline + supporting line per state, mirroring the component's own two text slots.
  const title = error ? errorText : file ? file.name : hasPhoto ? replaceLabel : triggerLabel;
  const subtitle =
    state === 'uploaded'
      ? [file ? formatFileSize(file.size) : null, uploadedLabel].filter(Boolean).join(' · ')
      : hint;

  return (
    <>
      {/* `rounded-[14px]` and the `#747474` / `#08d6ad` / `#ff4c58` edges are one-offs with no
          matching token (14px falls between the `lg`/`xl` radius steps; the greens/reds here are
          the mock's own "green system" / "red system" swatches, which exist as `--color-success`
          / `--color-destructive` — used below rather than restating the hex).
          `py-7 px-6` = the mock's 28/24 padding. `bg-background` is the exact #000000 token. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        // Drag-and-drop. `onDragOver` must preventDefault on EVERY move event, not just on enter —
        // without it the browser treats this as a non-drop target and shows the "no entry" cursor,
        // then navigates away to the file when released.
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          // Only the first file — this is a single-avatar field. Type/size are NOT filtered here
          // on purpose: handing a wrong file straight to the form lets the existing Zod rules
          // reject it and surface the reason in the box's own Error state, which is far more
          // useful than a silently ignored drop.
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onFileChange(dropped);
        }}
        className={cn(
          // `[&>*]:pointer-events-none` keeps drag events off the icon/labels: without it,
          // dragging across a child fires `dragleave` on the button and the highlight flickers.
          'flex w-full flex-col items-center gap-2 rounded-[14px] border bg-background px-6 py-7 transition-colors [&>*]:pointer-events-none',
          state === 'empty' && 'border-dashed border-[#747474]',
          state === 'uploaded' && 'border-success',
          state === 'error' && 'border-destructive',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : cn('cursor-pointer', state === 'empty' && 'hover:border-primary'),
          // Last, so it wins over whichever state colour is set above.
          isDragging && !disabled && 'border-primary',
        )}
      >
        <UploadIcon className="text-primary" />

        {/* `break-all` because the headline can be a raw file name, which has no spaces to wrap on
            and would otherwise blow out the box's width. */}
        <span className="break-all text-base text-foreground">{title}</span>
        <span
          className={cn(
            'text-tiny',
            state === 'uploaded' && 'text-success',
            state === 'error' && 'text-destructive',
            state === 'empty' && 'text-muted-foreground',
          )}
        >
          {subtitle}
        </span>
      </button>

      {isTooLarge ? (
        <ImageOptimizeHint maxSizeMb={MAX_AVATAR_SIZE_BYTES / (1024 * 1024)} className="mt-3" />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          onFileChange(selected);
          // Reset so picking the same file again still fires `onChange`.
          event.target.value = '';
        }}
      />
    </>
  );
}
