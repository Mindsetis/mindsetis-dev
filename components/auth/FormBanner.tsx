import type { ReactNode } from 'react';

type FormBannerProps = {
  variant?: 'error' | 'success';
  children: ReactNode;
};

/** Form-level banner for Server Action failures/successes (dark theme, accessible). */
export function FormBanner({ variant = 'error', children }: FormBannerProps) {
  const styles =
    variant === 'error'
      ? 'border-red-900/50 bg-red-950/40 text-red-200'
      : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-200';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
