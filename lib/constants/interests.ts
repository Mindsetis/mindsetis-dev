/**
 * Curated "interests" catalog for the member-profile form (Figma "Member profile 2/4" —
 * "Choose your interests" tag picker, node `387:2142`). Mirrors `SUPPORTED_LANGUAGES` in
 * `lib/constants/languages.ts`: a static, code-defined catalog rather than a DB seed table —
 * `value` is the stable slug stored in `profiles.interests` (text[]), `label` is the display
 * string, `category` groups tags under the fixed `INTEREST_CATEGORIES` filter chips, `emoji`
 * is the icon prefixed to each tag chip's label, and `sortOrder` controls display order within
 * a category.
 *
 * `value` is expected to be unique across the whole catalog — cross-tagging one interest into
 * two categories (as "Yoga" briefly was, in `Sports & Health` and `Culture & Art`) makes it
 * show up twice in the picker's "All" tab, which reads oddly to users. `INTEREST_VALUES`
 * below still dedupes defensively for `z.enum()`'s sake, and `InterestsPicker`'s "All" tab
 * dedupes by `value` too, but the catalog itself should not rely on that as a matter of
 * course — keep each `value` to a single row.
 *
 * Not run through next-intl: these are catalog values (like `SUPPORTED_LANGUAGES`), not
 * translated UI copy — profile content stays in the author's `content_locale` convention.
 */
import { INTEREST_CATEGORIES } from '@/lib/constants/interest-categories';

export const INTERESTS = [
  // Sports & Health
  { value: 'golf', label: 'Golf', category: INTEREST_CATEGORIES[0], emoji: '⛳', sortOrder: 10 },
  {
    value: 'tennis',
    label: 'Tennis',
    category: INTEREST_CATEGORIES[0],
    emoji: '🏓',
    sortOrder: 20,
  },
  { value: 'padel', label: 'Padel', category: INTEREST_CATEGORIES[0], emoji: '🎾', sortOrder: 30 },
  {
    value: 'skiing-snowboarding',
    label: 'Skiing & Snowboarding',
    category: INTEREST_CATEGORIES[0],
    emoji: '⛷️🏂',
    sortOrder: 40,
  },
  {
    value: 'running',
    label: 'Running',
    category: INTEREST_CATEGORIES[0],
    emoji: '🏃',
    sortOrder: 50,
  },
  {
    value: 'cycling',
    label: 'Cycling',
    category: INTEREST_CATEGORIES[0],
    emoji: '🚴',
    sortOrder: 60,
  },
  {
    value: 'swimming',
    label: 'Swimming',
    category: INTEREST_CATEGORIES[0],
    emoji: '🏊',
    sortOrder: 70,
  },
  {
    value: 'football',
    label: 'Football',
    category: INTEREST_CATEGORIES[0],
    emoji: '⚽',
    sortOrder: 80,
  },
  {
    value: 'basketball',
    label: 'Basketball',
    category: INTEREST_CATEGORIES[0],
    emoji: '🏀',
    sortOrder: 90,
  },
  {
    value: 'boxing',
    label: 'Boxing',
    category: INTEREST_CATEGORIES[0],
    emoji: '🥊',
    sortOrder: 100,
  },
  {
    value: 'bouldering',
    label: 'Bouldering',
    category: INTEREST_CATEGORIES[0],
    emoji: '🧗',
    sortOrder: 110,
  },
  {
    value: 'gym-fitness',
    label: 'Gym & Fitness',
    category: INTEREST_CATEGORIES[0],
    emoji: '🏋️',
    sortOrder: 120,
  },
  { value: 'yoga', label: 'Yoga', category: INTEREST_CATEGORIES[0], emoji: '🧘', sortOrder: 130 },

  // Travel & Outdoors
  {
    value: 'travel',
    label: 'Travel',
    category: INTEREST_CATEGORIES[1],
    emoji: '🏝️',
    sortOrder: 10,
  },
  {
    value: 'hiking',
    label: 'Hiking',
    category: INTEREST_CATEGORIES[1],
    emoji: '🏔️',
    sortOrder: 20,
  },
  {
    value: 'yachting',
    label: 'Yachting',
    category: INTEREST_CATEGORIES[1],
    emoji: '🚤',
    sortOrder: 30,
  },
  {
    value: 'road-trips',
    label: 'Road Trips',
    category: INTEREST_CATEGORIES[1],
    emoji: '🚐',
    sortOrder: 40,
  },
  {
    value: 'motorcycles',
    label: 'Motorcycles',
    category: INTEREST_CATEGORIES[1],
    emoji: '🏍️',
    sortOrder: 50,
  },

  // Gastronomy
  {
    value: 'wine-spirits',
    label: 'Wine & Spirits',
    category: INTEREST_CATEGORIES[2],
    emoji: '🍷',
    sortOrder: 10,
  },
  {
    value: 'fine-dining',
    label: 'Fine Dining',
    category: INTEREST_CATEGORIES[2],
    emoji: '🥗',
    sortOrder: 20,
  },
  {
    value: 'cooking',
    label: 'Cooking',
    category: INTEREST_CATEGORIES[2],
    emoji: '🔪',
    sortOrder: 30,
  },
  {
    value: 'tea-coffee-culture',
    label: 'Tea/Coffee Culture',
    category: INTEREST_CATEGORIES[2],
    emoji: '☕',
    sortOrder: 40,
  },

  // Culture & Art
  {
    value: 'art-collecting',
    label: 'Art & Collecting',
    category: INTEREST_CATEGORIES[3],
    emoji: '🖼️',
    sortOrder: 10,
  },
  { value: 'books', label: 'Books', category: INTEREST_CATEGORIES[3], emoji: '📚', sortOrder: 20 },
  {
    value: 'chess',
    label: 'Chess',
    category: INTEREST_CATEGORIES[3],
    emoji: '♟️',
    sortOrder: 30,
  },
  {
    value: 'theater',
    label: 'Theater',
    category: INTEREST_CATEGORIES[3],
    emoji: '🎭',
    sortOrder: 40,
  },
  {
    value: 'cinema',
    label: 'Cinema',
    category: INTEREST_CATEGORIES[3],
    emoji: '🎥',
    sortOrder: 50,
  },
  { value: 'dance', label: 'Dance', category: INTEREST_CATEGORIES[3], emoji: '💃', sortOrder: 70 },
  {
    value: 'mindfulness',
    label: 'Mindfulness',
    category: INTEREST_CATEGORIES[3],
    emoji: '🧿',
    sortOrder: 80,
  },

  // Social & Impact
  {
    value: 'charity',
    label: 'Charity',
    category: INTEREST_CATEGORIES[4],
    emoji: '🕊️',
    sortOrder: 10,
  },
  {
    value: 'volunteering',
    label: 'Volunteering',
    category: INTEREST_CATEGORIES[4],
    emoji: '🫶',
    sortOrder: 20,
  },
  {
    value: 'investing',
    label: 'Investing',
    category: INTEREST_CATEGORIES[4],
    emoji: '📉',
    sortOrder: 30,
  },
  {
    value: 'mentorship',
    label: 'Mentorship',
    category: INTEREST_CATEGORIES[4],
    emoji: '🧘',
    sortOrder: 40,
  },
  {
    value: 'podcasting',
    label: 'Podcasting',
    category: INTEREST_CATEGORIES[4],
    emoji: '🎙️',
    sortOrder: 50,
  },
  {
    value: 'public-speaking',
    label: 'Public Speaking',
    category: INTEREST_CATEGORIES[4],
    emoji: '🎤',
    sortOrder: 60,
  },
] as const;

export type InterestValue = (typeof INTERESTS)[number]['value'];

/** Deduped at runtime (unlike the raw `.map`) as a defensive backstop — every `value` above is
 *  meant to be unique (see this file's header), but a future duplicate would otherwise widen
 *  `InterestValue` with a repeated literal. Harmless either way for `z.enum()`; explicit dedup
 *  just keeps this list clean. */
export const INTEREST_VALUES = Array.from(new Set(INTERESTS.map((interest) => interest.value))) as [
  InterestValue,
  ...InterestValue[],
];
