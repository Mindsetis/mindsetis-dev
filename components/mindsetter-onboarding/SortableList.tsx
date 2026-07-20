'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
import type { ReactNode } from 'react';

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
 * - `PointerSensor` (mouse/pen) with a 6px activation distance so a plain click on an inner
 *   button (edit/delete, a link input) isn't hijacked as a drag start.
 * - `TouchSensor` with a 200ms press-and-hold before a drag begins, so a normal finger swipe
 *   still SCROLLS the page instead of grabbing a card. The drag listeners are also attached only
 *   to the small grip handle (not the whole card), so scrolling elsewhere is never affected.
 * - `KeyboardSensor` for accessible reorder (Space/Enter to pick up, arrows to move) — the a11y
 *   gap the old native DnD had (see `CollapsibleCard`'s former `// TODO keyboard a11y`).
 *
 * `restrictToParentElement` keeps the dragged item within the list bounds so it can't be flung
 * across the page.
 */
export function SortableList({ ids, onReorder, layout = 'vertical', children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    <DndContext
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
