# Технічне завдання — Mindsetis Community (MVP)

**Версія:** 1.0
**Стек:** Next.js 15 (App Router) · React 19 · TypeScript · Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) · Stripe Connect · pgvector · Redis (Upstash)
**Мова UI:** English-first (i18n наскрізно, готовність до іспанської) + Google Translate віджет
**Джерело:** Пропозиція «Mindsetis Community — MVP» (червень 2026)

---

## 1. Огляд системи

Mindsetis Community — платформа спільноти з member-first реєстрацією, каталогом користувачів (Members / Mindsetters), безкоштовними та платними 1:1 сесіями, груповими форматами (events), базовою верифікацією, AI-семантичним пошуком і повноцінною адмін-панеллю. Оплати й виплати — через Stripe Connect.

**Ключові ролі:**
- **Member** — базовий користувач (після реєстрації). Verified Member отримує право бронювати сесії, створювати події, надсилати Invite.
- **Mindsetter** — розширений профіль, відкриті 1:1 сесії, публічна сторінка.
- **Admin / Moderator** — команда Mindsetis (back-office).

**Поза межами MVP (Фаза 2+):** Communities (бізнес-спільноти) · BUILT NOT BURN · Гейміфікація (coins) · LinkedIn OAuth · Push-сповіщення · розширена аналітика/реферали.

---

## 2. Технологічна архітектура

### 2.1 Загальна схема

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js 15 (App Router)                │
│  RSC + Server Actions + Route Handlers · React 19 · TS   │
│  Tailwind + shadcn/ui · next-intl · Zod · TanStack Query │
└───────────────┬─────────────────────────┬────────────────┘
                │                          │
        Supabase JS (SSR)         Server-only (service role)
                │                          │
┌───────────────▼──────────────────────────▼────────────────┐
│                        SUPABASE                            │
│  Postgres (RLS) · Auth (Google OAuth + email) · Storage    │
│  Edge Functions (Deno) · Realtime · pgvector · pg_cron     │
└──────┬─────────────┬──────────────┬───────────────┬────────┘
       │             │              │               │
   Stripe         Google        LLM / Embed      Upstash
   Connect     Calendar+Meet     (OpenAI)         Redis
                                              (кеш AI-пошуку)
     Resend (email) · Google Translate widget (client)
```

### 2.2 Frontend

| Аспект | Рішення |
|---|---|
| Фреймворк | Next.js 15, App Router, React Server Components |
| Мова | TypeScript (strict) |
| Стилі | Tailwind CSS |
| Компоненти | shadcn/ui (Radix) + власний UI Kit |
| Форми | React Hook Form + Zod |
| Дані клієнта | TanStack Query (де потрібен клієнтський стан), інакше RSC + Server Actions |
| i18n | next-intl (App Router, `[locale]` сегмент) |
| Supabase клієнт | `@supabase/ssr` (окремі клієнти: browser / server / middleware / service) |

### 2.3 Backend / інфраструктура

| Аспект | Рішення |
|---|---|
| БД | Supabase Postgres, доступ через RLS |
| Auth | Supabase Auth: email+password (з підтвердженням), Google OAuth |
| Файли | Supabase Storage (аватари, обкладинки), signed URLs |
| Серверна логіка | Server Actions + Route Handlers (Next), Edge Functions (Supabase) для вебхуків/крон |
| Планувальник | `pg_cron` (нагадування, зняття hold, переіндексація) |
| Кеш | Upstash Redis (кеш AI-запитів, rate-limit) |
| Email | Resend (транзакційні + нагадування) |
| Платежі | Stripe Connect (destination charges, delayed transfers) |
| Відео | Google Calendar API → автогенерація Google Meet |
| Хостинг | Vercel (Next.js), Supabase Cloud |

> **Що робить чому:** платіжна/фінансова логіка, hold, split, вебхуки Stripe — **тільки на сервері** (service role / Edge Functions), ніколи не з клієнта. RLS — базовий рубіж безпеки для всіх таблиць.

---

## 3. Модель даних (Postgres / Supabase)

Нижче — цільова схема. Усі таблиці мають `id uuid default gen_random_uuid()`, `created_at`, `updated_at`. RLS увімкнено на всіх таблицях (`enable row level security`).

### 3.1 Профілі та ролі

```sql
-- Базовий профіль, 1:1 з auth.users
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  full_name     text,
  avatar_url    text,
  cover_url     text,
  tagline       text,
  location      text,
  bio           text,
  company       text,
  job_title     text,
  socials       jsonb default '{}',        -- {linkedin, instagram, x, website...}
  content_locale text default 'en',        -- мова контенту профілю
  account_type  text not null default 'member'  -- 'member' | 'mindsetter'
                check (account_type in ('member','mindsetter')),
  verification_status text not null default 'unverified'
                check (verification_status in ('unverified','pending','verified','rejected')),
  verification_deadline timestamptz,       -- +14 днів від реєстрації
  onboarding_step int default 0,           -- прогрес Save & Continue
  is_blocked    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Ролі команди (admin/moderator) окремо від account_type
create table staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin','moderator'))
);
```

**Розширений профіль Mindsetter** (окрема таблиця, щоб не роздувати `profiles`):

```sql
create table mindsetter_profiles (
  id            uuid primary key references profiles(id) on delete cascade,
  roles         text[] default '{}',       -- Roles
  superpowers   jsonb default '[]',        -- Superpowers
  promo_video   text,                      -- YouTube/Vimeo URL
  numbers       jsonb default '[]',        -- Numbers (метрики)
  help_with     text[] default '{}',       -- What I help with
  wins          jsonb default '[]',
  my_way        text,
  fckups        jsonb default '[]',        -- F*ckUps
  philosophy    text,
  is_public     boolean default false      -- публікується після верифікації
);
```

### 3.2 Верифікація

```sql
create table verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  linkedin_url text,
  company_name text,
  details      jsonb default '{}',         -- зрозумілі реквізити (без конф. документів)
  status       text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by  uuid references profiles(id),
  review_note  text,
  created_at   timestamptz default now()
);
```

**Матриця прав (реалізується через RLS + перевірки на сервері):**

| Дія | Member (unverified) | Verified Member | Mindsetter |
|---|---|---|---|
| Перегляд платформи/каталогу | ✅ | ✅ | ✅ |
| Публічний профіль | — | — | ✅ |
| Бронювати 1:1 | ❌ | ✅ | ✅ |
| Створювати події | ❌ | ✅ | ✅ |
| Надсилати Invite | ❌ | ✅ | ✅ |
| Відкривати власні 1:1 сесії | ❌ | ❌ | ✅ |

> **Логіка 14 днів:** при реєстрації ставиться `verification_deadline = now() + interval '14 days'`. `pg_cron` щодня перевіряє протерміновані `unverified` → блокує запити на сесії й події (перегляд лишається). Реалізовано як прапор у перевірках прав, не як видалення даних.

### 3.3 Сесії 1:1

```sql
-- Налаштування сесій майндсетера
create table session_settings (
  mindsetter_id uuid primary key references profiles(id) on delete cascade,
  session_type  text not null default 'free' check (session_type in ('free','paid')),
  duration_min  int default 30,
  topics        text[] default '{}',
  price_cents   int,                        -- для paid
  currency      text default 'usd',
  updated_at    timestamptz default now()
);

-- Слоти доступності (календар)
create table availability_slots (
  id            uuid primary key default gen_random_uuid(),
  mindsetter_id uuid references profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  is_booked     boolean default false
);

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  mindsetter_id uuid references profiles(id),
  booker_id     uuid references profiles(id),  -- сабскрайбер, хто бронює й платить
  slot_id       uuid references availability_slots(id),
  topic         text,
  session_type  text not null check (session_type in ('free','paid')),
  price_cents   int,
  meet_url      text,                          -- Google Meet
  status        text not null default 'scheduled'
                check (status in ('scheduled','completed_pending','held','paid_out','disputed','cancelled')),
  -- двостороннє підтвердження проведення
  confirmed_by_mindsetter boolean default false,
  confirmed_by_booker     boolean default false,
  hold_until    timestamptz,                   -- +48 год після зустрічі
  created_at    timestamptz default now()
);
```

**Життєвий цикл сесії:**
`scheduled` → (після часу зустрічі) двостороннє підтвердження → `completed_pending` → `held` (`hold_until = now()+48h`) → без скарги / за підтвердженням → `paid_out`. Скарга у вікні 48 год → `disputed` (ручний розбір адміном). Google Meet **не** підтверджує факт завершення — тільки взаємне підтвердження в кабінеті.

### 3.4 Групові формати (events)

```sql
create table events (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid references profiles(id),
  format        text not null check (format in ('networking','discussion','naked_soul','mastermind')),
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  duration_min  int,
  seats_min     int,
  seats_max     int,
  is_online     boolean default true,
  address       text,                          -- для офлайн
  is_paid       boolean default false,         -- платний = організатор платить за створення
  price_cents   int,
  access_mode   text default 'apply' check (access_mode in ('apply','invite')),
  auto_confirm  boolean default false,
  meet_url      text,
  status        text default 'draft'
                check (status in ('draft','review','published','cancelled')),
  created_at    timestamptz default now()
);

create table event_participants (
  event_id   uuid references events(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  state      text default 'applied' check (state in ('invited','applied','confirmed','rejected')),
  primary key (event_id, user_id)
);
```

**Флоу створення події:** Create → вибір формату → деталі → монетизація (free / paid — платить організатор) → доступ (Apply/Invite, авто/ручне) → модерація (`draft → review → published`) → після публікації автогенерація Meet (онлайн) або адреса (офлайн) + сповіщення.

### 3.5 Платежі та фінанси

```sql
create table stripe_accounts (
  user_id      uuid primary key references profiles(id) on delete cascade,
  stripe_account_id text unique,             -- Connect account
  onboarding_complete boolean default false,
  payouts_enabled boolean default false
);

create table transactions (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('session','event')),
  ref_id        uuid,                         -- session_id | event_id
  payer_id      uuid references profiles(id),
  payee_id      uuid references profiles(id),
  amount_cents  int not null,
  platform_fee_cents int not null,
  currency      text default 'usd',
  stripe_payment_intent text,
  status        text default 'pending'
                check (status in ('pending','held','released','refunded','failed')),
  created_at    timestamptz default now()
);

create table payouts (
  id            uuid primary key default gen_random_uuid(),
  payee_id      uuid references profiles(id),
  transaction_id uuid references transactions(id),
  stripe_transfer_id text,
  amount_cents  int,
  status        text default 'pending' check (status in ('pending','paid','failed')),
  created_at    timestamptz default now()
);
```

### 3.6 Допоміжні

```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  mindsetter_id uuid references profiles(id),
  author_id uuid references profiles(id),
  rating int check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);

-- «I'm on the way» — захоплення ліда
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  source text,                    -- звідки прийшов лід
  handled boolean default false,  -- переданий команді для ручного зв'язку
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
```

### 3.7 AI-пошук (pgvector)

```sql
create extension if not exists vector;

create table profile_embeddings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  embedding  vector(1536),          -- розмірність під обрану модель ембедингів
  updated_at timestamptz default now()
);

create index on profile_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

---

## 4. Row Level Security (принципи)

Приклади політик (повний набір — окремою міграцією):

```sql
-- profiles: усі можуть читати не заблоковані; редагувати тільки свій
create policy "profiles_read" on profiles
  for select using (is_blocked = false or auth.uid() = id or is_staff(auth.uid()));
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- sessions: бачить учасник; змінює статус через серверні функції
create policy "sessions_read_own" on sessions
  for select using (auth.uid() in (mindsetter_id, booker_id) or is_staff(auth.uid()));

-- transactions/payouts: тільки владнику + staff. Запис — тільки service role.
create policy "tx_read_own" on transactions
  for select using (auth.uid() in (payer_id, payee_id) or is_staff(auth.uid()));
```

**Правила:**
- Гроші, split, hold, вебхуки Stripe — записуються **лише service-role** (Edge Functions / серверні actions), клієнт не має INSERT/UPDATE на `transactions`/`payouts`.
- `is_staff(uuid)` — SQL-хелпер, що перевіряє `staff_roles`.
- Верифікаційні статуси й ролі змінюються тільки staff.

---

## 5. Функціональні модулі

### 5.1 Головна (лендінг)
Hero + CTA · Featured Mindsetters/Members (каруселі, куруються з адмінки) · відео про платформу · анонс 2–3 найближчих подій (тип+тема+дата+місця) → «Всі події» · блок «Чому Mindsetis» · фінальний CTA + sticky для мобільних · desktop+mobile.
*BUILT NOT BURN блок — пізніший етап.*

### 5.2 Реєстрація та онбординг (member-first)
- Перший екран — три шляхи: знайти майндсетера / стати майндсетером / знайти івент.
- Базова реєстрація Member: email+пароль або Google OAuth, підтвердження email. Кожен стартує як Member.
- Подовжений онбординг Mindsetter (опційно): вибір ролі, обов'язкові поля + додаткові блоки.
- **Save & Continue:** `onboarding_step` зберігається на кожному кроці; кроки 5–11 можна пропустити й дозаповнити з кабінету.
- Короткі пояснення «хто такий майндсетер» (зниження синдрому самозванця).
- «I'm on the way» → запис у `leads` одразу (навіть якщо далі не пройде), передається команді.
- Різні success screens (Member / Mindsetter).

### 5.3 Особистий кабінет
Редагування всіх секцій профілю (Hero, соцмережі, Roles, Superpowers, Promo video, Numbers, What I help with, Wins, My Way, F*ckUps, Philosophy) · Session Settings (тривалість, теми, календар, тип Free **АБО** Paid — один активний на період, зміна не ретроактивна) · «Мої події» (майбутні/минулі) · статус верифікації + прогрес · підключення Stripe Connect (обов'язкове перед платною сесією) · історія транзакцій.

### 5.4 Публічний профіль Mindsetter
Усі секції + «Мої події» · CTA Watch me / Book a Session / Invite (sticky, повтори) · окремий флоу Invite · мікро-навігація · адаптив. Публікується після верифікації (`is_public = true`).

### 5.5 Профіль Member (короткий)
Фото, ім'я, компанія, посада, локація, біо, соцмережі, бейдж верифікації · «Мої події».

### 5.6 Каталог + пошук + AI
- Персональний екран входу: «Welcome, @username» + підбірка по індустрії/ролі/темах з онбордингу.
- Перемикач Mindsetters / Members · картки · фільтри (тема, локація, індустрія) + пошук з автодоповненням.
- **AI-семантичний пошук** (togglable): запит звичайною мовою → ембединг → `pgvector` cosine search → LLM для інтерпретації/пояснення підбору. Кеш схожих запитів у Redis; переіндексація ембедингів при оновленні профілю (`pg_cron` / тригер). Фільтри лишаються базовим механізмом, AI поверх них.

### 5.7 Верифікація (спрощена)
LinkedIn + назва компанії + зрозумілі реквізити (без конф. документів) · черга заявок в адмінці + email-сповіщення · логіка 14 днів (див. 3.2) · для майстермайндів можлива додаткова перевірка на етапі участі.

### 5.8 Бронювання 1:1
Widget на профілі · вибір слоту/тривалості/теми · тип Free/Paid за поточними Session Settings (не ретроактивно) · оплата платної — платить booker (Stripe) · автогенерація Google Meet + email обом + нагадування (24 год, 1 год) · двостороннє підтвердження проведення · hold + 48 год на скаргу · «Мої сесії» (майбутні/минулі/скасовані) + білінг/інвойси.

### 5.9 Монетизація (Stripe Connect)
Прийом Visa/Mastercard · виплати через Connect (весь світ у межах покриття) · авто-split комісії (destination/separate charges) · hold через відкладені трансфери до кінця вікна скарги · refund-флоу · адмінка фінансів. Токенізація Stripe (карти не зберігаються у нас), PCI DSS на стороні Stripe; бізнес-акаунт Stripe реєструє клієнт.

### 5.10 Групові формати
Каталог подій (список, фільтри, пошук) · флоу створення (див. 3.4) · формати: нетворкінг (4–5), філософські/дискусійні, Naked Soul (картки-питання), майстермайнд · монетизація «організатор платить за створення» (різні формати — різна модель) · модерація командою · Apply/Invite, контроль списку, мінімум для старту, автопідтвердження · нагадування 24 год/1 год + сповіщення про скасування · офлайн-події (адреса замість Meet).

### 5.11 UI Kit / дизайн-система
Типографіка, кольори, кнопки, форми, поля, картки; базові компоненти + стани. Тема Masterclass/Netflix (чорний фон).

### 5.12 i18n + Google Translate
English-first увесь UI/тексти/email · інфраструктура i18n наскрізно (next-intl, словники, `[locale]` роутинг) для додавання мов без переробки · Google Translate віджет (автопереклад сторінки, стилізація під темну тему, шапка/футер) · контент профілів лишається мовою автора (`content_locale`).

### 5.13 Статичні сторінки
About, Privacy Policy, Terms of Service, Contact, 404, службові.

### 5.14 Адмін-панель (back-office / CMS)
Дашборд (користувачі, сесії, події, дохід) · CMS лендінгу (Hero, Featured каруселі, відео, «Чому Mindsetis», анонс подій, CTA) + статичні сторінки · керування користувачами (пошук/фільтр, редагування будь-якого профілю, зміна ролей/статусів, ручна верифікація, блокування) · керування подіями (перегляд/редагування/модерація, підтвердження/відхилення, список учасників, скасування) · верифікація (черга) · фінанси (транзакції, виплати, refunds, hold) · налаштування платформи (вмик/вимик модулів — платежі, AI-пошук — без коду, email-шаблони, переклади, ролі доступу admin/moderator).

---

## 6. Інтеграції

| Інтеграція | Призначення | Реалізація |
|---|---|---|
| **Stripe Connect** | оплати + виплати, split, hold | Server Actions + Edge Function для вебхуків (`payment_intent.succeeded`, `account.updated`, `transfer.*`). Delayed transfers для hold. |
| **Google OAuth** | вхід/реєстрація | Supabase Auth provider |
| **Google Calendar / Meet** | автогенерація Meet-посилань | серверний виклик Calendar API при підтвердженні сесії/публікації події |
| **LLM + Embeddings** | AI-пошук | ембединги профілів (при змінах), LLM для інтерпретації запиту та пояснення підбору |
| **Redis (Upstash)** | кеш AI-запитів, rate-limit | ключ = нормалізований запит; TTL |
| **Resend** | email (верифікація, бронювання, нагадування, модерація) | шаблони, керовані з адмінки |
| **Google Translate widget** | миттєва мультимовність | клієнтський скрипт, стилізація під тему |

---

## 7. Нефункціональні вимоги

- **Безпека:** RLS на всіх таблицях; фінансові записи — тільки service-role; валідація вебхуків Stripe за підписом; секрети в env (не в клієнті); Zod-валідація на межі.
- **Продуктивність:** RSC/SSR для першого рендеру; TanStack Query кеш; `ivfflat` індекс для векторного пошуку; Redis-кеш AI.
- **Масштабованість модулів:** платежі та AI-пошук — togglable з адмінки без деплою.
- **Адаптив:** усі публічні сторінки — desktop + mobile, sticky CTA на мобільних.
- **Локалізація:** архітектура готова до нових мов без переробки.
- **Спостережуваність:** логування вебхуків/платежів; статуси транзакцій відстежувані.

---

## 8. Етапи розробки та естімейт

Орієнтовний обсяг ядра MVP: **~505 год**, термін **~2,5 місяця**.

| Етап | Що включає | Год |
|---|---|---|
| 1.1 | Дизайн-система, лендінг (+анонс подій), статичні сторінки, інфраструктура (домен, хостинг, БД, Supabase, міграції) | ~70 |
| 1.2 | Member-first реєстрація + 3 шляхи, онбординг Member, подовжений онбординг Mindsetter (Save & Continue, пояснення), «I'm on the way», email-верифікація, профілі (+Invite, мікро-навігація, «Мої події»), кабінет (+перемикач типу сесій) | ~80 |
| 1.3 | Каталог (Mindsetters/Members), фільтри, пошук, персональна підбірка | ~40 |
| 1.4 | Базова верифікація + матриця прав + логіка 14 днів; бронювання 1:1, Google Meet, нагадування, підтвердження (hold + 48 год) | ~70 |
| 1.5 | Монетизація Stripe: оплати + виплати (Connect), авто-split, hold/refund, білінг/інвойси, адмінка фінансів | ~60 |
| 1.6 | Групові формати, флоу створення івентів, лістинг подій у профілях, «організатор платить», модерація, Apply/Invite, офлайн | ~58 |
| 1.7 | i18n (English-first + готовність ES) + Google Translate віджет, наскрізно | ~18 |
| 1.8 | AI-семантичний пошук: ембединги, pgvector, LLM-інтерпретація, Redis-кеш, переіндексація, toggle | ~50 |
| 1.9 | Адмін-панель (back-office/CMS): дашборд, CMS лендінгу + статичні, керування користувачами/профілями, редагування івентів, модулі + email-шаблони + переклади, ролі доступу | ~60 |
| **Разом** | **Ядро MVP** | **~505** |

**Окремі майбутні фази:**

| Фаза | Що включає | Год |
|---|---|---|
| Бізнес-спільноти (Communities) | тип акаунту Community, профіль/slug, каталог, прив'язка користувачів, керування з адмінки, вкладка каталогу | ~60 |
| BUILT NOT BURN | сторінка-каталог + шаблон інтерв'ю + проста CMS | ~65 |
| Гейміфікація (coins) | нарахування/списання, розрахунок сесій внутрішньою валютою | ~100 |

---

## 9. Ризики та примітки

- **Stripe Connect — найвищий ризик** MVP: onboarding продавців, split, delayed transfers для hold, refund/dispute-флоу. Закладати запас часу на тестування вебхуків і країнових обмежень.
- **Двостороннє підтвердження сесій** — джерело крайових випадків (одна сторона не підтвердила): чіткий стан + автозняття hold через 48 год + ручний розбір `disputed`.
- **AI-пошук** — токсичність вартості: кешувати запити (Redis), переіндексувати ембединги лише за зміни профілю, тримати модуль togglable.
- **Логіка 14 днів** — реалізувати як прапор у перевірках прав (не видаляти дані), покрити `pg_cron` + перевірками на сервері.
- Communities, BUILT NOT BURN, гейміфікація — не займати структуру MVP, але закласти нейтральні місця розширення (напр. `account_type` розширюваний, каталог має вкладку-заглушку в адмінці).
