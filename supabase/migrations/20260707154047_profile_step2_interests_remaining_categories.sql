-- =============================================================================
-- Member sign-up step 2/4 ("Member profile") — interests taxonomy follow-up:
-- seed the 4 categories left with zero tag rows in
-- 20260707141211_profile_step2_interests.sql ("Travel & Outdoors",
-- "Gastronomy", "Culture & Art", "Social & Impact").
-- =============================================================================
-- A deeper Figma re-scan surfaced the tag lists for these categories (the
-- original migration only had visible tag data for "Sports & Health" and left
-- the other four intentionally empty — see that migration's comment for why
-- "zero rows" was the correct placeholder-free representation at the time).
-- This is pure data: the `interests` table and its
-- `interests_category_label_key unique (category, label)` constraint already
-- exist (from 20260707141211_profile_step2_interests.sql), so no schema
-- change is needed here.
--
-- Note: "Yoga" is seeded here under `category = 'Culture & Art'`, distinct
-- from the existing `('Sports & Health', 'Yoga')` row — the taxonomy sheet
-- lists it under Culture & Art as well, and `unique (category, label)` allows
-- the same label under different categories, so this is not a duplicate.
-- =============================================================================

insert into interests (category, label, sort_order) values
  ('Travel & Outdoors', 'Travel',             10),
  ('Travel & Outdoors', 'Hiking',              20),
  ('Travel & Outdoors', 'Yachting',             30),
  ('Travel & Outdoors', 'Road Trips',           40),
  ('Travel & Outdoors', 'Motorcycles',          50),

  ('Gastronomy', 'Wine & Spirits',              10),
  ('Gastronomy', 'Fine Dining',                 20),
  ('Gastronomy', 'Cooking',                     30),
  ('Gastronomy', 'Tea/Coffee Culture',          40),

  ('Culture & Art', 'Art & Collecting',         10),
  ('Culture & Art', 'Books',                    20),
  ('Culture & Art', 'Chess',                    30),
  ('Culture & Art', 'Theater',                  40),
  ('Culture & Art', 'Cinema',                   50),
  ('Culture & Art', 'Yoga',                     60),
  ('Culture & Art', 'Dance',                    70),
  ('Culture & Art', 'Mindfulness',              80),

  ('Social & Impact', 'Charity',                10),
  ('Social & Impact', 'Volunteering',           20),
  ('Social & Impact', 'Investing',              30),
  ('Social & Impact', 'Mentorship',             40),
  ('Social & Impact', 'Podcasting',             50),
  ('Social & Impact', 'Public Speaking',        60)
on conflict (category, label) do nothing;
