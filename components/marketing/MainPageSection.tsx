import { AiSearchPreview } from './main-page/AiSearchPreview';
import { AmbassadorsSection } from './main-page/AmbassadorsSection';
import { FaqSection } from './main-page/FaqSection';
import { HeroBand } from './main-page/HeroBand';
import { MindsetisEventsSection } from './main-page/MindsetisEventsSection';
import { ThreeWaysToStart } from './main-page/ThreeWaysToStart';
import { TopMindsettersSection } from './main-page/TopMindsettersSection';
import { WhatIsMindsetis } from './main-page/WhatIsMindsetis';

/**
 * The real homepage — Figma "Main Page" (`572:5427` desktop / `1249:18262` mobile, grouped under
 * the file's own "Main Page" organizational section `552:3983`). Rendered by
 * `app/[locale]/page.tsx` only when `COMING_SOON_MODE` is off, in place of the old `HeroSection`
 * (moved to `/join`, see that route's own doc comment) — Header/Footer come from that page, not
 * from a layout, same as every other homepage variant (see `page.tsx`'s doc comment for why).
 *
 * SCOPE — one section of the Figma frame was deliberately NOT built here: "MINDSETIS ORIGINALS"
 * (`1188:5990`), a 3-video row whose third card is literally titled "BUILT NOT BORN | MasterClass
 * — The De-Risking Playbook". CLAUDE.md lists "BUILT NOT BURN" as explicit Phase-2/out-of-MVP-
 * scope ("do NOT build unless asked") — this is that same feature under its Figma working name,
 * so it's skipped here rather than built and flagged as a tradeoff after the fact. Every other
 * section of the frame (hero, what-is-Mindsetis, three ways to start, AI-search preview, Top
 * Mindsetters, Mindsetis Events, Ambassadors, FAQ) is in MVP scope per the spec's own feature
 * list (catalog, sessions, events, AI search, verification) and is built below, mostly as
 * illustrative/static marketing content — see each section's own doc comment for what's real vs.
 * a documented approximation (AI search has no backend yet, "All events"/"Join Waitlist"/
 * ambassador application have no dedicated routes, several cards reuse Figma's own
 * duplicate-placeholder copy).
 */
export function MainPageSection() {
  return (
    <>
      <HeroBand />
      <WhatIsMindsetis />
      <ThreeWaysToStart />
      <AiSearchPreview />
      <TopMindsettersSection />
      <MindsetisEventsSection />
      <AmbassadorsSection />
      <FaqSection />
    </>
  );
}
