'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Card } from '@/components/ui/card';
import { cn, mergeRefs } from '@/lib/utils';

/** Drag handle icon (20×20) — provided verbatim by the designer, hardcoded `fill="white"` (not
 * `currentColor`). */
function DragHandleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.25249 6.42857H17.8752C18.4001 6.42857 18.75 6.07143 18.75 5.53571C18.75 5 18.4001 4.64286 17.8752 4.64286H8.25249C7.72761 4.64286 7.37769 5 7.37769 5.53571C7.37769 6.07143 7.72761 6.42857 8.25249 6.42857ZM4.49088 12.9464V7.05357C4.66584 7.23214 4.84079 7.32143 5.01575 7.32143C5.27819 7.32143 5.45315 7.23214 5.62811 7.14286C5.97802 6.78571 6.0655 6.25 5.71559 5.89286L4.22844 4.10714C4.05348 3.83929 3.87852 3.75 3.61608 3.75C3.35365 3.75 3.09121 3.83929 2.91625 4.10714L1.4291 5.89286C1.16667 6.25 1.16667 6.78571 1.60406 7.14286C1.95398 7.41071 2.39137 7.41071 2.74129 7.14286V13.0357C2.39137 12.7679 1.95398 12.6786 1.60406 13.0357C1.25414 13.3929 1.16666 13.9286 1.51658 14.2857L3.00373 16.0714C3.09121 16.1607 3.35365 16.25 3.61608 16.25C3.87852 16.25 4.14096 16.1607 4.31592 15.8929L5.80307 14.1071C6.15298 13.75 6.0655 13.125 5.71559 12.8571C5.27819 12.5893 4.75331 12.5893 4.49088 12.9464ZM17.8752 9.10714H8.25249C7.72761 9.10714 7.37769 9.46429 7.37769 10C7.37769 10.5357 7.72761 10.8929 8.25249 10.8929H17.8752C18.4001 10.8929 18.75 10.5357 18.75 10C18.75 9.46429 18.4001 9.10714 17.8752 9.10714ZM17.8752 13.5714H8.25249C7.72761 13.5714 7.37769 13.9286 7.37769 14.4643C7.37769 15 7.72761 15.3571 8.25249 15.3571H17.8752C18.4001 15.3571 18.75 15 18.75 14.4643C18.75 13.9286 18.4001 13.5714 17.8752 13.5714Z"
        fill="white"
      />
    </svg>
  );
}

/** Edit (re-expand) icon (20×20) — provided verbatim by the designer, hardcoded `fill="white"`
 * (not `currentColor`). */
function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.8743 10.4044L14.2851 9.81518L6.32843 17.7719C6.14089 17.9594 5.88654 18.0648 5.62132 18.0648H3.5C2.94772 18.0648 2.5 17.617 2.5 17.0648V14.9434C2.5 14.6782 2.60536 14.4238 2.79289 14.2363L10.5139 6.51531C11.2949 5.73426 12.5612 5.73426 13.3423 6.51531L16.6422 9.81518C16.9676 10.1406 16.9676 10.6683 16.6422 10.9937L11.3388 16.2969C11.0134 16.6224 10.4858 16.6224 10.1603 16.2969C9.8349 15.9715 9.8349 15.4439 10.1603 15.1184L14.8743 10.4044ZM15.4636 2.74408L17.8207 5.1011C18.1461 5.42653 18.1461 5.95417 17.8207 6.27961L17.3493 6.75101C16.9587 7.14153 16.3256 7.14154 15.9351 6.75102L13.8137 4.62969C13.4232 4.23917 13.4232 3.606 13.8137 3.21547L14.2851 2.74408C14.6106 2.41864 15.1382 2.41864 15.4636 2.74408Z"
        fill="white"
      />
    </svg>
  );
}

/** Delete icon (20×20) — provided verbatim by the designer, hardcoded `fill="#FF4C58"` (not
 * `currentColor`). Exported so per-form Cards can reuse the exact same icon in their EXPANDED
 * header's own delete button (only the collapsed row's action icons are owned by this file). */
export function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.168 3.33366H17.5013C17.9615 3.33366 18.3346 3.70675 18.3346 4.16699C18.3346 4.62723 17.9615 5.00033 17.5013 5.00033H16.668V17.5003C16.668 17.9606 16.2949 18.3337 15.8346 18.3337H4.16797C3.70774 18.3337 3.33464 17.9606 3.33464 17.5003V5.00033H2.5013C2.04106 5.00033 1.66797 4.62723 1.66797 4.16699C1.66797 3.70675 2.04106 3.33366 2.5013 3.33366H5.83464C5.83464 2.41318 6.58083 1.66699 7.5013 1.66699H12.5013C13.4218 1.66699 14.168 2.41318 14.168 3.33366ZM8.33464 7.50033C7.8744 7.50033 7.5013 7.87342 7.5013 8.33366V13.3337C7.5013 13.7939 7.8744 14.167 8.33464 14.167C8.79487 14.167 9.16797 13.7939 9.16797 13.3337V8.33366C9.16797 7.87342 8.79487 7.50033 8.33464 7.50033ZM11.668 7.50033C11.2077 7.50033 10.8346 7.87342 10.8346 8.33366V13.3337C10.8346 13.7939 11.2077 14.167 11.668 14.167C12.1282 14.167 12.5013 13.7939 12.5013 13.3337V8.33366C12.5013 7.87342 12.1282 7.50033 11.668 7.50033Z"
        fill="#FF4C58"
      />
    </svg>
  );
}

export type CollapsibleCardProps = {
  /**
   * True once this card's REQUIRED fields are non-empty. Drives two things: (a) the card's
   * initial expand/collapse state at mount (a freshly-added, still-empty card starts EXPANDED;
   * an already-filled card — e.g. loaded from a previous save — starts COLLAPSED), and (b)
   * whether an outside click is allowed to collapse it at all (an incomplete card never
   * auto-collapses, so the caller doesn't lose place mid-fill).
   */
  isFilled: boolean;
  /** Small uppercase label rendered on the collapsed card's TOP row, alongside the action icons
   * (e.g. "ROLE 1" / "SUPERPOWER 1/3") — kept separate from `collapsedSummary` so the action
   * icons align with just this label line, not the whole (possibly multi-line) summary block. */
  title: ReactNode;
  /** Compact read-only summary rendered when collapsed, BELOW the `title` row — the
   * value/description/links, NOT the label itself (that's `title`); shape is entirely up to the
   * caller (see each Form's own `*CardSummary` helper). */
  collapsedSummary: ReactNode;
  /** The full editable fields, rendered when expanded — unchanged from the pre-collapse cards. */
  children: ReactNode;
  /** Removes/clears this card. Omit to hide the trash icon on the collapsed action row (e.g. the
   * one remaining card in a min-1 list) — for fixed-slot forms (superpowers) this should CLEAR
   * the slot's fields rather than remove the card, so the slot count never changes. */
  onDelete?: () => void;
  /** aria-label for the collapsed trash icon — reuse each form's existing "Remove …" key. */
  deleteLabel: string;
  /** aria-label for the collapsed pencil (re-expand) icon. */
  editLabel: string;
  /** aria-label for the collapsed drag handle. */
  reorderLabel: string;
  /** Stable sortable id for this card (the `useFieldArray` field id, or a stable slot id for the
   * fixed-slot Superpowers form). The parent must wrap the whole list in `SortableList` with the
   * matching `ids`; `@dnd-kit`'s `useSortable` here reads it. */
  id: string;
  /** Whether this card can be picked up and reordered (disabled for single-item lists — nothing
   * to reorder). The drag listeners attach only to the collapsed grip handle; touch/mouse/keyboard
   * all work via `SortableList`'s sensors. */
  draggable?: boolean;
  className?: string;
};

/**
 * Shared "collapse-on-blur" wrapper for the 7 card-list onboarding forms (roles, superpowers,
 * help, numbers, wins, my-way, f*ckups). Encapsulates: the expanded/collapsed state itself,
 * click-outside detection (a `mousedown` listener + this card's own ref — collapses only when
 * `isFilled` and the click landed outside this card), the collapsed layout (a single `title` row
 * — the "ROLE 1"-style label plus the 3 action icons drag handle/edit/delete, all on ONE row —
 * followed by `collapsedSummary` below it), and the `@dnd-kit` sortable wiring (the collapsed
 * grip handle is the drag source; the parent wraps the list in `SortableList` and applies the
 * reorder — works on mouse, touch AND keyboard, unlike the old native HTML5 DnD which was
 * mouse-only and dead on phones).
 *
 * Each per-form Card component (`RoleCard`, `SuperpowerCard`, ...) keeps its own field markup —
 * this wrapper only decides WHICH of `children` (expanded fields) or `title`+`collapsedSummary`
 * (collapsed) to show, plus the chrome around that decision. Multiple cards may be expanded at
 * once (not exclusive) — the requirement is only that a FILLED card collapses once the click
 * lands outside it.
 *
 * The EXPANDED state's own title+delete header is NOT rendered here — it stays inside each
 * caller's `children` (unchanged from before this collapsed-alignment fix), so only the COLLAPSED
 * row gets the `title`/action-icons treatment.
 */
export function CollapsibleCard({
  isFilled,
  title,
  collapsedSummary,
  children,
  onDelete,
  deleteLabel,
  editLabel,
  reorderLabel,
  id,
  draggable = false,
  className,
}: CollapsibleCardProps) {
  // Lazy initializer — only evaluated once, at mount. A brand-new card (`EMPTY_ROLE` etc.) is
  // not filled yet, so it starts expanded; a card hydrated from already-saved data starts
  // collapsed. Later changes to `isFilled` (the caller typing into the fields) intentionally do
  // NOT reactively re-run this — only the outside-click effect below is allowed to collapse.
  const [expanded, setExpanded] = useState(() => !isFilled);
  const cardRef = useRef<HTMLDivElement>(null);

  // Drag-to-reorder (mouse/touch/keyboard via `SortableList`'s sensors). Only pickable when
  // draggable AND collapsed — an expanded card has no grip handle to grab; it stays droppable so
  // other cards can still be dropped past it.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: { draggable: !draggable || expanded, droppable: false },
  });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!expanded || !isFilled) return;

    function handleMouseDown(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded, isFilled]);

  function handleDelete() {
    onDelete?.();
    // For a fixed-slot "clear" (superpowers), the slot is now empty again and should re-open for
    // editing; for a real "remove" (roles/help/numbers/wins), this card unmounts right after, so
    // the extra state update is a harmless no-op.
    setExpanded(true);
  }

  return (
    <div
      ref={mergeRefs(cardRef, setNodeRef)}
      style={sortableStyle}
      className={cn(isDragging && 'relative z-10')}
    >
      <Card className={cn('rounded-xl px-4 py-4', expanded ? 'gap-3' : 'gap-4', className)}>
        {expanded ? (
          children
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              {title}
              <div className="flex shrink-0 items-center gap-4">
                {draggable ? (
                  <span
                    className="cursor-grab touch-none active:cursor-grabbing"
                    aria-label={reorderLabel}
                    {...attributes}
                    {...listeners}
                  >
                    <DragHandleIcon />
                  </span>
                ) : (
                  <span className="cursor-grab" aria-label={reorderLabel} role="img">
                    <DragHandleIcon />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label={editLabel}
                  className="cursor-pointer"
                >
                  <EditIcon />
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    aria-label={deleteLabel}
                    className="cursor-pointer"
                  >
                    <DeleteIcon />
                  </button>
                ) : null}
              </div>
            </div>
            {collapsedSummary}
          </>
        )}
      </Card>
    </div>
  );
}
