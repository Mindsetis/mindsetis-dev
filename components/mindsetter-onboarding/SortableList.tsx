'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { type ReactNode, useId } from 'react';

type SortableListProps = {
  /** Stable ids of the items being sorted, in current render order. Each sortable child must call
   * `useSortable` (via `CollapsibleCard`'s `id` prop, or `ReelLifeForm`'s photo tile) with the
   * matching id. */
  ids: string[];
  /** Called on drop with the moved item's OLD and NEW indices — the caller applies the reorder to
   * its own source of truth (`useFieldArray`'s `move`, an `arrayMove` on state, etc.). */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** `'vertical'` (default) for stacked cards, `'grid'` for the Reel Life photo grid. */
  layout?: 'vertical' | 'grid';
  children: ReactNode;
};

/**
 * Shared drag-to-reorder context for the onboarding card lists and the Reel Life photo grid —
 * replaces the previous native HTML5 drag-and-drop (`draggable` + `onDrag*`), which fires on
 * mouse only and is effectively dead on touch devices (iOS Safari / Android Chrome don't
 * synthesize `dragstart`/`drop` from touch), so reordering was impossible on phones.
 * `@dnd-kit` supports mouse, touch AND keyboard, so all three now work.
 *
 * Sensors:
 * - `MouseSensor` with a 6px activation distance so a plain click on an inner button (edit/delete,
 *   a link input) isn't hijacked as a drag start.
 * - `TouchSensor` with a 200ms press-and-hold before a drag begins, so a normal finger swipe
 *   still SCROLLS the page instead of grabbing a card.
 * - `KeyboardSensor` for accessible reorder (Space/Enter to pick up, arrows to move) — the a11y
 *   gap the old native DnD had (see `CollapsibleCard`'s former `// TODO keyboard a11y`).
 *
 * MOUSE, NOT POINTER (2026-08-11). `PointerSensor` also receives TOUCH input, and on a touch
 * device the browser claims the gesture for scrolling and fires `pointercancel` before the 6px
 * distance is reached — so the drag aborts unless the draggable carries `touch-action: none`.
 * That was fine while the only draggable was a tiny grip handle (`CollapsibleCard` still sets it),
 * but `ReelLifeForm` now makes the WHOLE photo tile draggable, and `touch-action: none` there
 * would kill page scrolling across the entire grid. Restricting this sensor to mouse leaves touch
 * exclusively to `TouchSensor`, whose hold delay distinguishes "scroll" from "drag" without
 * needing that CSS at all.
 *
 * Known gap: pen/stylus input is handled by neither (it is a `pointer` type). Nobody drags these
 * lists with a stylus today; if that changes, the fix is a second `PointerSensor` filtered to
 * `pointerType === 'pen'`.
 *
 * `restrictToParentElement` keeps the dragged item within the list bounds so it can't be flung
 * across the page.
 */
export function SortableList({ ids, onReorder, layout = 'vertical', children }: SortableListProps) {
  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;
    onReorder(fromIndex, toIndex);
  }

  return (
    /* `id` is passed explicitly because dnd-kit falls back to a MODULE-LEVEL counter when it isn't
       (`DndDescribedBy-0`, `-1`, …), which it writes into the `aria-describedby` of every draggable.
       That counter restarts at zero on the server for each request but keeps climbing in the
       browser as contexts mount, so the ids the server rendered and the ones React found on
       hydration disagreed — a real hydration error in the console on every page with a sortable
       list (`/dashboard/profile/roles`, `/mindsetter-onboarding/roles`), found 2026-09-20.
       `useId` is the React-sanctioned answer: same value on both sides, unique per instance. */
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}
