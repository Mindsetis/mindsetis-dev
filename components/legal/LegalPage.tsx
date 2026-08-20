import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'subheading'; text: string };

type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

type LegalPageProps = {
  /** `auth`-style dotted namespace under `legal.*`, e.g. `"legal.privacyPolicy"`. */
  namespace: 'legal.privacyPolicy' | 'legal.termsOfUse' | 'legal.cookiesPolicy';
};

/**
 * Desktop title/contact-heading sizes measured PER DOCUMENT, not unified — Figma genuinely
 * uses `--text-h1` (88px) for Terms of Use's page title but `--text-h2` (72px) for the other
 * two, and `--text-m` (22px) for Terms of Use's "Contact Us" card heading but `--text-l` (32px)
 * for the other two. Mobile title stays `--text-h1`'s mobile override (32px) for all three —
 * only Privacy Policy has a mobile frame to confirm against, so this assumes the other two match
 * it rather than Terms of Use's own larger desktop size.
 */
const TITLE_SIZE: Record<LegalPageProps['namespace'], string> = {
  'legal.privacyPolicy': 'md:text-h2',
  'legal.termsOfUse': 'md:text-h1',
  'legal.cookiesPolicy': 'md:text-h2',
};

const CONTACT_HEADING_SIZE: Record<LegalPageProps['namespace'], string> = {
  'legal.privacyPolicy': 'text-l',
  'legal.termsOfUse': 'text-m',
  'legal.cookiesPolicy': 'text-l',
};

/**
 * Shared layout for the three legal documents — Figma "Privacy Policy" (`1112:26877` desktop /
 * `1152:16559` mobile), "Terms of Use" (`1112:27066`, desktop only), "Cookies Policy"
 * (`1112:27271`, desktop only). All three share one structure (banner → intro → N sections →
 * "Contact"/"Questions" callout card), so this renders all three off one data-driven component
 * rather than three near-identical page bodies — the caller (`app/[locale]/privacy-policy/
 * page.tsx` etc.) only supplies which `legal.*` translation branch to read.
 *
 * LIGHT-ON-DARK EXCEPTION: unlike every other page in this app, Figma puts a WHITE content body
 * under the dark banner here (`fills:#ffffff` on the "Page" frame, `#000000`/`#2a2a2a` text) —
 * confirmed deliberate (both `get_node` and a rendered screenshot agree), not a design mistake,
 * so it's built as specified rather than forced into the site's usual dark theme. `#2a2a2a` body
 * text and the `#747474` list-dot color have no matching `--color-*` token (closest, `--color-
 * border`/`--color-input`, is `#747474` — reused via `bg-border` for the dot; body text has no
 * match at all, hardcoded).
 *
 * Content model (`t.raw()`, same technique `Footer.tsx` already uses for its link-label
 * arrays): each section is `{ heading, blocks[] }`, where a block is a `paragraph`, a bulleted
 * `list`, or a `subheading` (Privacy Policy's lettered "A. EEA…" / "B. US…" subsections, 18px
 * bold — no matching type-scale token, hardcoded `text-[18px]`). This nests better than a flat
 * "sections: [{heading, body}]" shape would for the sections that mix paragraphs, lists, and
 * sub-headings in sequence (e.g. "Your Privacy Rights"), without inventing per-item markup.
 *
 * Any "Label: rest of the sentence" lead-in (paragraphs and list items alike, e.g. "Account
 * Data: Name, email address…") is bolded up to and including the first ": " — Figma marks these
 * runs bold via `fontName: "mixed"` on the text node, but this MCP server's text-scan tools
 * don't expose per-character style ranges, so the delimiter is used to reconstruct the bold
 * split predictably instead of hand-marking ~40 occurrences with rich-text tags.
 *
 * Figma also has a mobile Privacy Policy frame (`1152:16559`) with the SAME structure but
 * several body paragraphs trimmed/reworded (e.g. dropping "(an individual)" and the "or
 * 'Business' under U.S. laws" clause from the "Who We Are" section) — confirmed by reading that
 * frame directly. Divergent legal wording between breakpoints is a real legal risk and almost
 * certainly an editing slip rather than an intentional per-device policy difference (also: only
 * Privacy Policy has a mobile frame at all — Terms of Use/Cookies Policy don't), so this always
 * renders the single (fuller) desktop copy at every width. Flag this for legal review if the
 * mobile Figma wording was actually intentional.
 */
export async function LegalPage({ namespace }: LegalPageProps) {
  const t = await getTranslations(namespace);
  const tLegal = await getTranslations('legal');

  const intro = t.raw('intro') as string[];
  const sections = t.raw('sections') as LegalSection[];
  const contact = t.raw('contact') as { heading: string; body: string };

  return (
    <>
      {/* Banner — `#000000` (`bg-background`) at every width. Figma's mobile frame fills this
          `#1a1a1a`, but per the designer (2026-08-18) both breakpoints are meant to be pure
          black, so the mobile fill isn't mirrored here. 32px above the breadcrumb on both. */}
      <div className="bg-background px-4 pt-8 pb-8 sm:px-6 md:pb-24 lg:px-[70px]">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-3 md:gap-8">
          <p className="text-tiny text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              {tLegal('breadcrumb.home')}
            </Link>
            {'  /  '}
            {tLegal('breadcrumb.legal')}
            {'  /  '}
            {t('title')}
          </p>

          <div className="flex flex-col gap-3 md:gap-3.5">
            <p className="text-[11px] font-bold tracking-[0.3em] text-primary uppercase">
              {tLegal('eyebrow')}
            </p>
            <h1
              className={`bg-[image:var(--gradient-primary)] bg-clip-text font-display text-h1 leading-none text-transparent md:leading-[0.9] ${TITLE_SIZE[namespace]}`}
            >
              {t('title')}
            </h1>
            <p className="text-tiny text-muted-foreground">{t('lastUpdated')}</p>
          </div>
        </div>
      </div>

      {/* Body — Figma "Page" (`#ffffff`). Content column is 1300px (1440 - 70px sides), so this
          intentionally does NOT reuse the 580/640px column other pages use — legal copy reads as
          a long-form article, not a form. Top corners are rounded so the white panel reads as a
          sheet laid over the dark banner rather than a hard colour switch. */}
      <div className="rounded-t-[32px] bg-white px-4 pt-8 pb-8 text-[#2a2a2a] sm:px-6 md:pt-16 md:pb-24 lg:px-[70px]">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-6 md:gap-10">
          {intro.map((paragraph) => (
            <p key={paragraph} className="text-body">
              {paragraph}
            </p>
          ))}

          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2 md:gap-3">
              <h2 className="font-display text-[24px] leading-none text-black md:text-h3">
                {section.heading}
              </h2>
              {section.blocks.map((block, index) => (
                <LegalBlockView key={index} block={block} />
              ))}
            </section>
          ))}

          {/* Figma "Contact" — cornerRadius 16, `#f4f4f4` fill, 24px padding (same card
              component reused verbatim across all three documents, just with a different
              heading size per document — 32px on Privacy Policy/Cookies Policy, 22px on Terms
              of Use; kept as measured rather than unified). */}
          <div className="flex flex-col gap-2 rounded-2xl bg-[#f4f4f4] p-6">
            <h2
              className={`font-display leading-none text-black ${CONTACT_HEADING_SIZE[namespace]}`}
            >
              {contact.heading}
            </h2>
            <p className="whitespace-pre-line text-body">
              <LinkedEmails text={contact.body} />
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Turns every email address in a string into a `mailto:` link.
 *
 * Done by scanning the rendered string rather than by wrapping the addresses in `t.rich` tags in
 * the translations: the three documents carry different addresses in different shapes — Privacy
 * Policy lists two separated by a slash (`legal@` / `privacy@`), Terms of Use one (`info@`),
 * Cookies Policy mentions one mid-sentence — so tag-marking each would mean three different key
 * shapes and a tag to forget the next time this copy is edited. Matching is deliberately narrow
 * (no consecutive dots, TLD of 2+ letters) and the trailing punctuation of a sentence stays
 * outside the link because `.` can't end the match.
 */
function LinkedEmails({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/gi);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={`mailto:${part}`} className="text-[#5892c3] hover:underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Bolds a "Label: " lead-in, if any, then renders the rest plain — see the module doc comment. */
function LeadInText({ text }: { text: string }) {
  const separatorIndex = text.indexOf(': ');
  if (separatorIndex === -1) {
    return <>{text}</>;
  }
  return (
    <>
      <span className="font-bold">{text.slice(0, separatorIndex + 1)}</span>
      {text.slice(separatorIndex + 1)}
    </>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === 'subheading') {
    return <h3 className="text-[18px] font-bold text-black">{block.text}</h3>;
  }

  if (block.type === 'list') {
    return (
      // `items-center` on each row, not the usual first-line alignment: the dot centres on the
      // item's full height, so a wrapped multi-line entry keeps it beside the middle of the block
      // rather than pinned to the first line (requested 2026-08-18). Single-line items look the
      // same either way, which is why the previous `mt-[9px]` nudge is gone with it.
      <ul className="flex flex-col gap-2">
        {block.items.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-border" />
            <p className="text-body">
              <LeadInText text={item} />
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-body">
      <LeadInText text={block.text} />
    </p>
  );
}
