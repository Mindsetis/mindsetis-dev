import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB. The "Member profile" step (stage 1.1) submits the profile-photo
      // upload straight through a Server Action as `FormData`; the `avatars` bucket allows
      // files up to 5 MB (see supabase/migrations/20260701090100_storage_buckets.sql), so
      // this needs enough headroom above that for multipart overhead + the rest of the
      // form's fields.
      bodySizeLimit: '6mb',
    },
  },
};

export default withNextIntl(nextConfig);
