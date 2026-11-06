import 'server-only';

/** Where Help & Support messages go. Override per environment with the `SUPPORT_EMAIL` env var. */
export const DEFAULT_SUPPORT_EMAIL = 'support@mindsetis.com';

export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}
