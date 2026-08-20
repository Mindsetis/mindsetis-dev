'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Marks a control whose feature does not exist yet: dims it, blocks interaction, and explains
 * why on hover/focus with a "Coming soon" tooltip.
 *
 * WHY THE WRAPPER SPAN
 *   A `disabled` button emits no pointer events at all, so hanging a tooltip trigger directly
 *   on it would never fire — the tooltip would be invisible precisely on the controls that need
 *   it. The span is the trigger instead; it stays interactive while the control inside is inert.
 *   `tabIndex={0}` keeps it reachable by keyboard, since the disabled control itself drops out
 *   of the tab order.
 *
 * WHAT THE CALLER STILL OWNS
 *   Disabling. This component does NOT disable its child — it cannot reach into an arbitrary
 *   element's props — so every call site passes `disabled` itself. That is deliberate: several
 *   of these controls will need to stay disabled for other reasons once the feature ships (a
 *   Mindsetter can never book a session with themselves, for instance), and the two conditions
 *   should read separately at the call site rather than being conflated here.
 *
 * `className` exists for width: the wrapper sits between a flex row and its item, so a
 * full-width button needs the span to be full-width too, or it collapses to content size.
 */
export function ComingSoon({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations('common');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn('inline-flex cursor-not-allowed', className)}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{t('comingSoon')}</TooltipContent>
    </Tooltip>
  );
}
