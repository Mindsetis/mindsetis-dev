import type { ReactNode } from 'react';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * Full site chrome (Header + Footer, both `variant="full"` by default) shared by every
 * route EXCEPT the homepage (`app/[locale]/page.tsx`), which sits outside this route group
 * and renders its own minimal Header/Footer instead (stage 1.11, ROADMAP).
 *
 * `ScrollToTopButton` used to be mounted here, on the reasoning that the only route outside this
 * group was a coming-soon placeholder homepage with nothing to scroll back up to. That homepage
 * has since become the full marketing page, so the button was missing from the longest page on
 * the site; it moved up to `app/[locale]/layout.tsx` on 2026-09-02 and is now global. The
 * header/footer stay here — the homepage still renders its own.
 *
 * This is a route group (`(app)`), so it does not add a URL segment — `/sign-up`,
 * `/dashboard/profile`, etc. keep their exact paths. This markup used to live directly in
 * the root `app/[locale]/layout.tsx`; it moved here so the homepage can opt out of it.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
