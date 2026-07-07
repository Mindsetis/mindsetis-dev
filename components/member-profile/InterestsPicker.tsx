'use client';

import { useState } from 'react';

import { Chip } from '@/components/ui/chip';
import { INTEREST_CATEGORIES } from '@/lib/constants/interest-categories';
import { MAX_INTERESTS } from '@/lib/validation/member-profile';

export type InterestOption = {
  id: string;
  category: string;
  label: string;
};

type InterestsPickerProps = {
  interests: readonly InterestOption[];
  value: string[];
  onChange: (value: string[]) => void;
  allCategoryLabel: string;
  countLabel: (selected: number, max: number) => string;
  disabled?: boolean;
};

const ALL_CATEGORY = '__all__';

/**
 * "Choose your interests" — category filter chips (Figma: All, Sports & Health, Travel &
 * Outdoors, Gastronomy, Culture & Art, Social & Impact) filter which tag chips are shown;
 * tag chips are multi-select toggles capped at `MAX_INTERESTS` total across every category.
 *
 * Categories come from the fixed `INTEREST_CATEGORIES` constant, NOT from the distinct
 * `category` values actually present in the fetched `interests` catalog: only "Sports &
 * Health" has seeded tag rows so far (see the migration comment referenced in
 * `lib/constants/interest-categories.ts`), so deriving categories from present rows would
 * silently drop the other four instead of showing them (empty for now).
 */
export function InterestsPicker({
  interests,
  value,
  onChange,
  allCategoryLabel,
  countLabel,
  disabled,
}: InterestsPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);

  const visibleInterests =
    activeCategory === ALL_CATEGORY
      ? interests
      : interests.filter((interest) => interest.category === activeCategory);

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={activeCategory === ALL_CATEGORY}
            onClick={() => setActiveCategory(ALL_CATEGORY)}
            disabled={disabled}
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
        <span className="shrink-0 text-tiny text-muted-foreground">
          {countLabel(value.length, MAX_INTERESTS)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleInterests.map((interest) => {
          const isSelected = value.includes(interest.id);
          return (
            <Chip
              key={interest.id}
              selected={isSelected}
              showCheck
              disabled={disabled || (!isSelected && limitReached)}
              onClick={() => toggle(interest.id)}
            >
              {interest.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
