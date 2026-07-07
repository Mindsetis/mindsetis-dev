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
};

/**
 * Minimal profile-photo upload control — no existing file-upload UI component in
 * `components/ui/`, so this is a small, purpose-built button trigger + hidden native
 * `<input type="file">` + preview thumbnail (no cropping/drag-drop, per the task scope).
 * The actual Storage upload happens server-side in the Server Action; this component only
 * hands the raw `File` up to the form (RHF field value), plus renders a local
 * `URL.createObjectURL` preview.
 */
export function AvatarUpload({
  file,
  onFileChange,
  triggerLabel,
  replaceLabel,
  disabled,
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

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {previewUrl ? <AvatarImage src={previewUrl} alt="" /> : null}
        <AvatarFallback>
          <User className="size-8 text-muted-foreground" aria-hidden="true" />
        </AvatarFallback>
      </Avatar>

      <Button
        type="button"
        variant="secondary"
        size="default"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {file ? replaceLabel : triggerLabel}
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
