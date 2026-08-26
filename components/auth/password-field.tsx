'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Password-field furniture shared by every form that asks for a NEW password — the sign-up form
 * (`SignUpForm`) and the cabinet's "Change password" (`ChangePasswordForm`).
 *
 * Extracted verbatim from `SignUpForm`, where these lived as module-private helpers, when the
 * cabinet grew three more password inputs. Nothing about the markup, icons or i18n keys changed —
 * the keys deliberately stay under `auth.signUp.*` rather than being renamed to something neutral,
 * because renaming them would touch the wizard's copy for no user-visible gain.
 */

/**
 * Password-hint status icon (12×12) — `fill="currentColor"` so it inherits the `<li>`'s
 * success/destructive text color (replaces the previously-always-neutral `lucide-react` `Info`
 * icon). Note: the source asset as supplied had a hardcoded `fill="white"`; overridden to
 * `currentColor` here so the icon actually turns red/green with the hint text.
 */
function PasswordHintIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 11C3.23857 11 1 8.7614 1 6C1 3.23857 3.23857 1 6 1C8.7614 1 11 3.23857 11 6C11 8.7614 8.7614 11 6 11ZM6 5.5C5.72386 5.5 5.5 5.72386 5.5 6V8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8V6C6.5 5.72386 6.27614 5.5 6 5.5ZM6 3.5C5.72386 3.5 5.5 3.72386 5.5 4C5.5 4.27614 5.72386 4.5 6 4.5C6.27614 4.5 6.5 4.27614 6.5 4C6.5 3.72386 6.27614 3.5 6 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Live password requirement checklist — Figma "input password" shows three hint lines
 * ("At least 8 characters" / "At least 1 uppercase letter" / "At least 1 number") next to an
 * info icon. The uppercase-letter hint mirrors `passwordSchema`'s `/[A-Z]/` regex
 * (`lib/validation/common.ts`), so the enforced rule and the displayed copy stay in sync.
 *
 * Color states: neutral `text-foreground` (white) before the visitor has typed anything —
 * nothing has been checked yet, so nothing should read as failing. Once `password` is
 * non-empty, each hint switches to `text-success`/`text-destructive` per whether it's met.
 */
export function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('auth');
  const isChecking = password.length > 0;

  const requirements = [
    { key: 'length', met: password.length >= 8 },
    { key: 'letter', met: /[A-Z]/.test(password) },
    { key: 'number', met: /[0-9]/.test(password) },
  ] as const;

  return (
    <ul className="flex flex-col gap-1">
      {requirements.map(({ key, met }) => (
        <li
          key={key}
          className={cn(
            'flex items-center gap-1 text-tiny font-normal',
            !isChecking && 'text-foreground',
            isChecking && (met ? 'text-success' : 'text-destructive'),
          )}
        >
          <PasswordHintIcon />
          {t(`signUp.passwordHints.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Icon shown while the password is HIDDEN (`visible === false`) — clicking it reveals the
 * password. Fill is a literal hardcoded `#747474` (this codebase's convention for custom
 * icon assets, e.g. `AvatarUpload.tsx`'s `UploadIcon`), not `currentColor`.
 */
function PasswordHiddenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g clipPath="url(#clip0_2013_1066)">
        <path
          d="M3.01495 3.9563L0.930409 1.87177L1.87322 0.928955L15.0726 14.1283L14.1298 15.0711L11.9231 12.8645C10.7889 13.5836 9.44384 14.0001 8.0015 14.0001C4.40672 14.0001 1.41607 11.4135 0.789062 8.00006C1.08018 6.41514 1.88085 5.00852 3.01495 3.9563ZM9.83977 10.7811L8.86377 9.80512C8.60264 9.93006 8.31024 10.0001 8.0015 10.0001C6.8969 10.0001 6.00148 9.10459 6.00148 8.00006C6.00148 7.69126 6.07145 7.39886 6.19639 7.13772L5.22041 6.16177C4.8714 6.68872 4.66814 7.32066 4.66814 8.00006C4.66814 9.84099 6.16053 11.3334 8.0015 11.3334C8.68084 11.3334 9.31277 11.1301 9.83977 10.7811ZM5.31761 2.50669C6.14882 2.17965 7.05417 2.00003 8.0015 2.00003C11.5962 2.00003 14.5869 4.58654 15.2139 8.00006C15.0058 9.13312 14.5372 10.1751 13.8725 11.0616L11.2993 8.48839C11.3227 8.32899 11.3348 8.16592 11.3348 8.00006C11.3348 6.15908 9.84244 4.6667 8.0015 4.6667C7.83557 4.6667 7.6725 4.67881 7.5131 4.70221L5.31761 2.50669Z"
          fill="#747474"
        />
      </g>
      <defs>
        <clipPath id="clip0_2013_1066">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * Icon shown while the password is VISIBLE (`visible === true`) — clicking it hides the
 * password again. Fill is a literal hardcoded `#79B9E3` (matches `--color-primary`, kept as a
 * literal per the same custom-icon convention, not `currentColor`).
 */
function PasswordVisibleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M0.789062 8C1.41607 4.58651 4.40672 2 8.0015 2C11.5962 2 14.5869 4.58651 15.2139 8C14.5869 11.4135 11.5962 14 8.0015 14C4.40672 14 1.41607 11.4135 0.789062 8ZM8.0015 11.3333C9.84244 11.3333 11.3348 9.84093 11.3348 8C11.3348 6.15905 9.84244 4.66667 8.0015 4.66667C6.16053 4.66667 4.66814 6.15905 4.66814 8C4.66814 9.84093 6.16053 11.3333 8.0015 11.3333ZM8.0015 10C6.8969 10 6.00148 9.1046 6.00148 8C6.00148 6.8954 6.8969 6 8.0015 6C9.10604 6 10.0015 6.8954 10.0015 8C10.0015 9.1046 9.10604 10 8.0015 10Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** Trailing show/hide toggle overlaid on a password `<Input>`. */
export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const t = useTranslations('auth');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? t('signUp.hidePassword') : t('signUp.showPassword')}
      className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
    >
      {visible ? <PasswordVisibleIcon /> : <PasswordHiddenIcon />}
    </button>
  );
}
