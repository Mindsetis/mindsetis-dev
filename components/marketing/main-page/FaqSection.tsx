import { ChevronDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';

/**
 * FAQ — Figma `1229:6172` (heading) + six "Surface" cards (`1235:6482` etc.). Only the FIRST
 * card is expanded with real answer copy in Figma (`#BlockText`, "Who can join Mindsetis?");
 * the other five are genuinely collapsed in the source file with NO answer text authored
 * anywhere in their layer tree (confirmed node-by-node, not just visually collapsed) — a content
 * gap in the design, not a layout choice. Rather than inventing plausible-sounding answers for
 * the other five (explicitly against the "never invent design that isn't in the file" rule),
 * those five ship with an honest "Answer coming soon." placeholder
 * (`home.main.faq.items[1-5].answer`) — flagged here and in the handoff report for whoever owns
 * the real FAQ copy to fill in.
 *
 * Built as a plain `<details>`/`<summary>` accordion — no client-side state needed, so this stays
 * a Server Component (`border-[#2a2a2a]` card border matches the exact hardcoded value Figma
 * uses for this subtle divider, same value already used by `ImageOptimizeHint`).
 */
export async function FaqSection() {
  const t = await getTranslations('home.main.faq');
  const items = t.raw('items') as { question: string; answer: string }[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <h2
        className={`font-display text-l leading-[0.9] font-normal md:text-h2 ${GRADIENT_HEADING_CLASSNAME}`}
      >
        {t('title')}
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[#2a2a2a] bg-card p-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="font-display text-m leading-none font-normal text-foreground">
                {item.question}
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-4 text-body text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
