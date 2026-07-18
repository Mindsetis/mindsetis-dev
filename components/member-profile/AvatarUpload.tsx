'use client';

import { User } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ACCEPTED_AVATAR_MIME_TYPES } from '@/lib/validation/member-profile';

const ACCEPT_ATTR = ACCEPTED_AVATAR_MIME_TYPES.join(',');

type AvatarUploadProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  triggerLabel: string;
  replaceLabel: string;
  disabled?: boolean;
  /**
   * The profile's already-saved `avatar_url` (editing an existing profile — see
   * `MemberProfileForm`'s `initialAvatarUrl` prop). Shown as the thumbnail until the caller
   * picks a new `file`, at which point the local object-URL preview below takes over.
   */
  initialAvatarUrl?: string | null;
};

/**
 * Upload-button icon (16×16) — provided verbatim by the user for the stage 1.6 copy/UI pass.
 * `fill="currentColor"` (not the originally-hardcoded `white`) so it follows the button's own
 * text color across states now that this button uses `variant="outline"` (whose text color
 * actually changes per state, unlike the previous `secondary` variant's always-white text).
 */
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.9987 4.00004C8.46536 4.00004 7.9987 4.46671 7.9987 5.00004C7.9987 5.53337 8.46536 6.00004 8.9987 6.00004C9.53203 6.00004 9.9987 5.53337 9.9987 5.00004C9.9987 4.46671 9.53203 4.00004 8.9987 4.00004ZM12.6654 1.33337H3.33203C2.1987 1.33337 1.33203 2.20004 1.33203 3.33337V12.6667C1.33203 13.8 2.1987 14.6667 3.33203 14.6667H12.6654C13.7987 14.6667 14.6654 13.8 14.6654 12.6667V3.33337C14.6654 2.20004 13.7987 1.33337 12.6654 1.33337ZM13.332 9.26671L12.0654 8.00004C11.2654 7.26671 9.9987 7.26671 9.26536 8.00004L8.66536 8.60004L6.73203 6.66671C5.93203 5.93337 4.66536 5.93337 3.93203 6.66671L2.66536 7.93337V3.33337C2.66536 2.93337 2.93203 2.66671 3.33203 2.66671H12.6654C13.0654 2.66671 13.332 2.93337 13.332 3.33337V9.26671Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Minimal profile-photo upload control — no existing file-upload UI component in
 * `components/ui/`, so this is a small, purpose-built button trigger + hidden native
 * `<input type="file">` + preview thumbnail (no cropping/drag-drop, per the task scope).
 * The actual Storage upload happens server-side in the Server Action; this component only
 * hands the raw `File` up to the form (RHF field value), plus renders a local
 * `URL.createObjectURL` preview (falling back to `initialAvatarUrl` — the already-saved
 * photo — when no new file has been picked yet).
 *
 * Stage 1.6: the preview `Avatar` circle used to always render (falling back to a generic
 * `User` silhouette icon when no photo existed yet) — it's now only rendered once there's an
 * actual photo (`hasPhoto`), and the upload button itself gets a small icon to its left.
 */
export function AvatarUpload({
  file,
  onFileChange,
  triggerLabel,
  replaceLabel,
  disabled,
  initialAvatarUrl,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Created during render (not via a setState-in-effect, which would trigger an extra
  // cascading render) — the effect below only handles the cleanup side effect (revoking the
  // previous object URL once it's no longer the current preview).
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? initialAvatarUrl ?? null;
  const hasPhoto = Boolean(file ?? initialAvatarUrl);

  return (
    <div className="flex items-center gap-6">
      {hasPhoto ? (
        <Avatar className="size-20 shrink-0">
          {displayUrl ? <AvatarImage src={displayUrl} alt="" /> : null}
          <AvatarFallback>
            <User className="size-8 text-muted-foreground" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="default"
        className="flex-1"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon />
        {hasPhoto ? replaceLabel : triggerLabel}
      </Button>

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
    </div>
  );
}
