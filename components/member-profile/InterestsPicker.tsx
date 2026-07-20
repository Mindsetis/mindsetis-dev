'use client';

import { useState } from 'react';

import { Chip } from '@/components/ui/chip';
import { INTEREST_CATEGORIES } from '@/lib/constants/interest-categories';
import { INTERESTS } from '@/lib/constants/interests';
import { MAX_INTERESTS } from '@/lib/validation/member-profile';

type InterestsPickerProps = {
  value: string[];
  onChange: (value: string[]) => void;
  allCategoryLabel: string;
  disabled?: boolean;
};

const ALL_CATEGORY = '__all__';

/**
 * "Choose your interests" — category filter chips (Figma: All, Sports & Health, Travel &
 * Outdoors, Gastronomy, Culture & Art, Social & Impact) filter which tag chips are shown;
 * tag chips are multi-select toggles capped at `MAX_INTERESTS` total across every category.
 *
 * Categories come from the fixed `INTEREST_CATEGORIES` constant, NOT from the distinct
 * `category` values actually present in `INTERESTS`, so every category chip always shows up
 * even if a category temporarily has no tags.
 *
 * `INTERESTS` is imported directly (static code-defined catalog, see
 * `lib/constants/interests.ts`) rather than threaded in as a prop.
 */
export function InterestsPicker({
  value,
  onChange,
  allCategoryLabel,
  disabled,
}: InterestsPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  const visibleInterests =
    activeCategory === ALL_CATEGORY
      ? INTERESTS
      : INTERESTS.filter((interest) => interest.category === activeCategory);

  const limitReached = value.length >= MAX_INTERESTS;

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (limitReached) return;
    onChange([...value, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        <Chip
          selected={activeCategory === ALL_CATEGORY}
          onClick={() => setActiveCategory(ALL_CATEGORY)}
          disabled={disabled}
          className="min-w-[48px]"
        >
          {allCategoryLabel}
        </Chip>
        {INTEREST_CATEGORIES.map((category) => (
          <Chip
            key={category}
            selected={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            disabled={disabled}
          >
            {category}
          </Chip>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {/* Figma (387:2142): the active category's name appears as a small heading above its
            tag chips. When "All" is active there is no single category to name, so Figma
            shows no heading at all — only the tag row. */}
        {activeCategory !== ALL_CATEGORY && (
          <p className="text-sm text-foreground">{activeCategory}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {visibleInterests.map((interest) => {
            const isSelected = value.includes(interest.value);
            return (
              <Chip
                // `value` repeats across categories (e.g. "yoga" in both Sports & Health and
                // Culture & Art), so the key must include `category` to stay unique.
                key={`${interest.category}-${interest.value}`}
                selected={isSelected}
                showCheck
                disabled={disabled || (!isSelected && limitReached)}
                onClick={() => toggle(interest.value)}
              >
                <span>
                  <span aria-hidden="true">{interest.emoji}</span>
                  {interest.label}
                </span>
              </Chip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
