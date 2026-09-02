import type { ReactNode } from 'react';

/**
 * Small icon + all-caps label above a section heading (Figma "Frame 17", reused for every
 * section of the Main Page homepage — "WHAT IS MINDSETIS" appears twice verbatim, "AI search",
 * "TOP MINDSETTERS", "MINDSETIS EVENTS"). Text recipe is the same "tiny spacing" Figma style
 * already used sitewide (`Label`'s `boldSpacing` variant, `RegistrationProgress`,
 * `CabinetSidebar`, etc.) — replicated here as plain markup rather than importing the Radix
 * `Label` component itself, since this isn't a form field label.
 */
export function SectionEyebrow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
