import type { ReactNode } from 'react';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * Full site chrome (Header + Footer, both `variant="full"` by default) shared by every
 * route EXCEPT the homepage (`app/[locale]/page.tsx`), which sits outside this route group
 * and renders its own minimal Header/Footer instead (stage 1.11, ROADMAP).
 *
 * `ScrollToTopButton` is mounted here rather than in the outer `app/[locale]/layout.tsx` for
 * the same reason as the header/footer: that layout also wraps the coming-soon placeholder
 * homepage, a single short screen with nothing to scroll back up to.
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
      <ScrollToTopButton />
    </>
  );
}
