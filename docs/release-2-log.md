# Реліз 2 — журнал виконаних задач

> Що тут лежить: по одному запису на **прийняту** задачу зі списку `docs/release-2-tasks.md`
> (правки клієнтки «Правки 3.0» + рішення дзвінка 28.10.2026).
> Запис створює агент `task-verifier` після того, як прийняв задачу — не раніше.
> Задача, яку відправили на доопрацювання, сюди не потрапляє: вона лишається відкритою
> у списку зі статусом `- [~]`.
>
> Формат запису фіксований: **Зроблено** (що змінилось, із файлами) · **Перевірено вживу**
> (які стани й ширини прогнали в реальному браузері, з чим звірили у Figma) · **Проблеми і
> питання** (що спливло, що треба спитати в клієнтки) · **Як це протестувати** (покрокова
> інструкція для ручної перевірки — адреса, стан акаунта, дії, очікуваний результат).

## Процес

1. Задача в роботі → у `release-2-tasks.md` вона `- [~]`.
2. Будуємо в робочому дереві, комітів до прийняття не робимо.
3. `task-verifier` читає вимогу (док клієнтки + рішення власника й дзвінка в трекері), перевіряє
   код, ганяє `typecheck` / `lint`, прогонює задачу в реальному Chromium — усі стани, 375 і 1440,
   консоль і мережу — і звіряє вигляд з еталонними кадрами Figma. Кроки інструкції з тестування
   він спершу проходить сам.
4. **🔁 На доопрацювання** — повертається в роботу з нумерованим списком правок.
5. **✅ Прийнято** — `task-verifier` ставить `- [x]` у списку й дописує запис сюди.
6. Власник тестує руками за інструкцією з запису. Якщо щось не так — задача відкривається знову.
7. Тільки після підтвердження власника — коміт через `git-manager`.

---

## П1 — перевірка email на першому екрані `/join`

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- `/join`: перед переходом на Create account сервер перевіряє, чи пошта вже має підтверджений акаунт — `components/marketing/HeroEmailCta.tsx:66` → нова дія `checkJoinEmail` (`app/[locale]/(app)/join/actions.ts:31-53`) через наявну SQL-функцію `email_has_confirmed_account` (`lib/auth/account-lookup.ts`). Ліміти: 5 / 10 хв на IP (`join/actions.ts:52`) і 5 / год на адресу (`:38`).
- Повідомлення під полем дослівно з доку (варіант 1) з посиланням «Log in →» на `/login?email=…` — `components/auth/EmailAlreadyRegisteredMessage.tsx`, підставляється замість `FormMessage` (`HeroEmailCta.tsx:109-110`). Те саме повідомлення — на кроці 1/4, якщо конфлікт ловить уже `signUp` (`components/auth/SignUpForm.tsx:115-116`, маркер `EMAIL_ALREADY_REGISTERED` у `lib/validation/auth.ts`).
- `/login?email=…` підставляє пошту в поле (перевірка тим самим `emailSchema`) — `app/[locale]/(app)/login/page.tsx:38,61`.
- Непідтверджена пошта — як раніше: людина йде далі на `/sign-up` (повторний лист підтвердження).
- i18n: `auth.emailExists.message` в `messages/en.json` і `messages/es.json`. Міграцій і залежностей немає.

### Перевірено вживу

- Гість, `/join`, 1440 і 375: пошта `c7full` (регістр і пробіли навмисно змішані: « RomanLoza211+C7FULL@Gmail.com ») → лишаємось на `/join`, під полем «This email is already registered. Please Log in → to access your account or finish your application.»; посилання веде на `/login?email=romanloza211%2Bc7full%40gmail.com`, пошта вже в полі.
- Те саме для `t03` (Mindsetter) на 375.
- Негатив: «not-an-email» → «Enter a valid email address.»; нова пошта `r2v1` → `/sign-up?email=…`; непідтверджена `r2v1` (до підтвердження) → теж `/sign-up`, без повідомлення.
- Крок 1/4 (`/sign-up`), 375 і 1440: зареєстрована пошта → те саме повідомлення під полем, без другого банера.
- Повернення на незавершений крок після входу: `t02` (анкета Member-а не завершена) → `/member-profile`; `c7full` (почав онбординг Mindsetter-а) → кабінет, за правилом дзвінка (П4).
- Консоль: помилок немає; мережа: 4xx/5xx на цих сторінках немає.
- `npm run typecheck`, `npm run lint` — чисто.

### Проблеми і питання

- На проді перевірка на `/join` вимкнена, доки немає ключів Upstash (I7): без лімітів це був би безкоштовний «оракул» наявності акаунтів (`join/actions.ts:34`). Тоді людина дізнається про акаунт на кроці 1/4 — повідомлення там те саме. Отже, П1 на проді запрацює повністю лише після I7.
- Серверні ліміти локально не перевірити: у `.env.local` немає Upstash.

### Як це протестувати

1. Вийдіть з акаунта (або відкрийте вікно інкогніто) і відкрийте `/join`.
2. Введіть пошту вже зареєстрованого й підтвердженого акаунта, наприклад `romanloza211+c7full@gmail.com`, — можна великими літерами і з пробілами.
3. Натисніть Continue.
4. Натисніть «Log in →» у червоному повідомленні під полем.
5. Відкрийте `/join` ще раз, введіть нову адресу, якої немає в базі, і натисніть Continue.
   **Очікуваний результат:** після кроку 3 ви лишаєтесь на `/join`, під полем написано «This email is already registered. Please Log in → to access your account or finish your application.»; після кроку 4 відкривається «Welcome back», і пошта вже вписана в поле; після кроку 5 відкривається «Create account» (крок 1/4), пошта підставлена.
   **Де ще подивитись:** ширина 375 — повідомлення переноситься під полем; акаунт із незавершеною анкетою Member-а (`romanloza211+t02@gmail.com`) після входу відкривається на «Set your identity».

## П2 — «Link expired» для посилання скидання пароля

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- `/api/auth/confirm` визначає вид посилання (`linkKind`, `app/api/auth/confirm/route.ts:130`) і для скидання пароля передає на `/link-expired` ще й `?type=recovery` (`route.ts:228`). Працює й тоді, коли Supabase кладе помилку у фрагмент `#error=…` (`components/auth/LinkExpiredHashReason.tsx:44` зберігає `type`).
- `/link-expired?type=recovery` — заголовок, опис, кнопка і повідомлення після надсилання дослівно з доку (`app/[locale]/(app)/link-expired/page.tsx:14,70-79`, ключі `auth.linkExpired.recovery.*`). Форма для recovery викликає `requestPasswordReset`, а не повторне підтвердження реєстрації (`components/auth/LinkExpiredForm.tsx:88`). Для signup — без змін.
- Помилка `resetPasswordForEmail` тепер пишеться в лог сервера (без адреси) — `app/[locale]/(app)/(auth)/actions.ts:249-258`.
- Мова не губиться: усі посилання з листів несуть `&locale=…` для не-англійської мови (`lib/auth/confirm-link.ts:28`), confirm редіректить у неї (`route.ts:171`).
- Пауза 60 с після надсилання — див. Т1.
- i18n: `auth.linkExpired.recovery.*` в `en.json` і `es.json`.

### Перевірено вживу

- Використане посилання скидання для `c7new` (генерував через service-role, той самий формат `/api/auth/confirm?next=/reset-password&token_hash=…&type=recovery`, що в нашому шаблоні листа) → `/link-expired?reason=expired&type=recovery`: «Link expired» / «This password reset link has expired or has already been used. Enter your email to receive a new one.» / кнопка «Resend reset link».
- Ввів `romanloza211+c7new@gmail.com` → «Resend reset link» → «Check your inbox. If this email is registered, a new reset link has been sent.», кнопка стала «Resend in 1:00» і вимкнулась. У `auth.users.recovery_sent_at` для `c7new` з'явився час кліку (13:58:38 UTC) — лист Supabase справді відправив.
- Signup-посилання (використаний magic-link `r2v1`) → «Link expired» з «Resend confirmation email» — як і раніше.
- Фрагментний шлях (`/api/auth/confirm?next=/reset-password#error=access_denied&error_code=otp_expired`) → лишається recovery-варіант.
- `/es`: посилання з `&locale=es` → `/es/link-expired?…type=recovery`, тексти іспанською.
- Негатив: порожнє поле → «Email is required.»; `?reason=invalid&type=recovery` → «Reset link invalid».
- Ширини 1440 і 375; консоль без помилок, POST дії — 200.

### Проблеми і питання

- Сам лист я не відкривав (скриньки немає): доставку, спам-папку й те, що посилання з нового листа відкриває форму зміни пароля, власник перевіряє з реальною поштою (Т4). Посилання того самого вигляду, згенероване через service-role, форму відкриває.

### Як це протестувати

1. Вийдіть з акаунта, відкрийте `/forgot-password`, введіть пошту свого тестового акаунта (наприклад `romanloza211+c7new@gmail.com`) і натисніть «Send reset link».
2. Відкрийте посилання з листа і задайте новий пароль (див. П3).
3. Відкрийте те саме посилання з листа ще раз.
4. Введіть ту саму пошту в поле й натисніть «Resend reset link».
5. Відкрийте новий лист і перейдіть за посиланням.
   **Очікуваний результат:** після кроку 3 — сторінка «Link expired» з текстом «This password reset link has expired or has already been used. Enter your email to receive a new one.» і кнопкою «Resend reset link»; після кроку 4 — зелене повідомлення «Check your inbox. If this email is registered, a new reset link has been sent.» і кнопка «Resend in 1:00»; після кроку 5 — форма «Set a new password».
   **Де ще подивитись:** ширина 375; старе посилання підтвердження реєстрації має й далі показувати «Resend confirmation email»; іспанська — запит скидання з `/es/forgot-password` (я перевірив лише сам редірект із `&locale=es`, не лист): «Link expired» має відкритися як «Enlace caducado».

## П3 — автовхід після зміни пароля

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_Скасовує рішення релізу 1 «після зміни пароля — вихід із сесії і повторний вхід» (блок A)._

### Зроблено

- `updatePassword` більше не робить `signOut()`: сесія лишається, решта сесій користувача на інших пристроях завершується (`signOut({ scope: 'others' })`, `app/[locale]/(app)/(auth)/actions.ts:315`), дія повертає, куди йти далі — кабінет або незавершений крок (`:326`, той самий `resolveOnboardingRedirect`).
- Форма показує тост «Password updated successfully!» і переходить туди (`components/auth/ResetPasswordForm.tsx:88-89`). Сторінку `/password-changed` видалено (тепер 404), з `AuthScreen` прибрано її варіант.
- Безпека: новий пароль можна задати лише з підписаним маркером посилання скидання (15 хв, `lib/auth/recovery-marker.ts`; ставиться в `app/api/auth/confirm/route.ts:196`, перевіряється в `actions.ts:288`, знімається після успіху `:307`). Дія більше не скидає `access_restricted` і не продовжує 14-денний дедлайн.
- Той самий пароль, що й зараз, → окреме повідомлення «Your new password must be different from your current one.» (`actions.ts:295`).
- i18n: `auth.resetPassword.success / samePassword / sessionExpired / requestNew` в `en.json` і `es.json`; ключі `passwordChanged.*` прибрано з обох.

### Перевірено вживу

- `c7new`, 1440: посилання скидання → «Set a new password» → спершу ввів поточний пароль → «Your new password must be different from your current one.»; потім новий тимчасовий → тост «Password updated successfully!» і одразу кабінет `/dashboard/profile` з аватаром у хедері, без екрана «Password changed» і без повторного входу.
- Інші сесії: до скидання відкрив другу сесію `c7new` окремим клієнтом — після скидання її refresh-токен відхилено (`refresh_token_not_found`).
- Одноразовість: старе посилання → «Link expired» (recovery); старий пароль → `invalid_credentials`; новий → вхід успішний.
- Негатив безпеки: залогінений `c7new` без свіжого посилання відкрив `/reset-password` і спробував задати пароль → «Your reset link is invalid or has expired. Please request a new one.» + «Request a new link».
- 375: друге скидання (повернув пароль `Mindsetis!2026`) → тост і кабінет.
- `/password-changed` → «Page not found».
- Консоль без помилок.

### Проблеми і питання

- Лист скидання я не відкривав — посилання того самого формату генерував через service-role. Перехід зі справжнього листа (зокрема з іншого пристрою) — у Т4.

### Як це протестувати

1. Вийдіть з акаунта, відкрийте `/forgot-password`, введіть пошту тестового акаунта і натисніть «Send reset link».
2. Відкрийте посилання з листа.
3. Введіть у обидва поля пароль, який зараз стоїть на акаунті, і натисніть «Save new password».
4. Введіть новий пароль у обидва поля і натисніть «Save new password».
5. Вийдіть і спробуйте увійти на `/login` зі старим паролем, потім із новим.
   **Очікуваний результат:** на кроці 3 — червоне повідомлення «Your new password must be different from your current one.»; на кроці 4 — унизу праворуч тост «Password updated successfully!», і відкривається кабінет (або незавершений крок анкети), ви вже залогінені — екрана «Password changed» і форми входу немає; на кроці 5 старий пароль дає «Incorrect email or password.», новий — пускає.
   **Де ще подивитись:** ширина 375; якщо цей акаунт був відкритий в іншому браузері, після зміни пароля там сесія має завершитись.

## П5 — «Continue Registration» замість «Upgrade» для того, хто почав онбординг Mindsetter-а

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_За дзвінком 28.10: вікно-нагадування з доку не робимо — його замінила пряма кнопка «Continue Registration» у хедері й кабінеті._

### Зроблено

- Новий стан кнопки хедера `mindsetterInProgress` — Member, у якого вже є рядок `mindsetter_profiles` (`lib/auth/cta-state.ts:46,77,81`). Хедер: «Continue Registration», на мобільному «Continue» (`components/layout/Header.tsx:87,188`).
- Банер кабінету для такого Member-а: текст клієнтки «You’ve started upgrading to Mindsetter. Complete all sections…» + «Continue Registration» (`components/dashboard/MemberStatusBanner.tsx:44`, прапор `mindsetterWizardStarted` у `lib/profile/cabinet.ts:177`).
- Єдина точка входу `/mindsetter-onboarding` веде на наступний незбережений крок (`app/[locale]/(app)/mindsetter-onboarding/page.tsx:44`, `lib/auth/onboarding-redirect.ts:76`); туди ведуть вікно Upgrade (`components/mindsetter/UpgradeToMindsetterDialog.tsx:169`), `/welcome` (`components/auth/WelcomeCtas.tsx:70`) і «Who is Mindsetter?» (`components/auth/WhoIsMindsetterDialog.tsx:170`). Mindsetter-а точка входу веде в кабінет.
- i18n: `continueRegistration`, `continueRegistrationShort`, `dashboard.statusBanner.inProgressBody / inProgressCta` в `en.json` і `es.json`.

### Перевірено вживу

- Усі стани кнопки хедера, кожен окремим акаунтом:
  - гість — «Apply to Join»;
  - Member із незавершеною анкетою (`t02`) — «Edit Profile» → `/continue`;
  - Member, який не починав (`c7new`, і `r2v1` після 4/4) — «Upgrade» + банер «Upgrade Now»; Upgrade → вікно → «Start Mindsetter Application» → `/mindsetter-onboarding/roles`, статус лишився `member`, рядок `mindsetter_profiles` не створився;
  - почав онбординг (`c7full`; `r2v1` після збереження ролей) — «Continue Registration» у хедері й банері; обидві ведуть на `/mindsetter-onboarding/superpowers` (наступний незбережений крок);
  - Mindsetter (`t03`; `r2v1` після shine) — «Create Event», банера немає; `/mindsetter-onboarding` → кабінет.
- 375: у хедері «Continue» 88×46 px, правий край 344 при ширині 360 (+15 px смуги прокрутки) — горизонтального переповнення немає (`scrollWidth = clientWidth`); банер переноситься коректно.
- Консоль без помилок; RSC-запити `/mindsetter-onboarding` — 200.

### Проблеми і питання

- Один раз (перше відкриття маршруту на дев-сервері) клік «Continue Registration» лишив порожню сторінку на `/mindsetter-onboarding`, хоча запит на `/superpowers` повернув 200. Повторити не вдалося ні разу (5 наступних кліків з хедера, банера і `/welcome` — усе відкривається). Схоже на першу компіляцію в dev; варто глянути один раз на Vercel-превʼю.
- ❓ Модерація перед Create Event (стан «Your profile is under review») — не робимо, доки немає адмінки (питання 5 до клієнтки).

### Як це протестувати

1. Увійдіть на `/login` як `romanloza211+c7new@gmail.com` / `Mindsetis!2026` (Member, онбординг Mindsetter-а не починав).
2. Подивіться на кнопку праворуч у хедері й банер «Your status: Member» у кабінеті.
3. Вийдіть і увійдіть як `romanloza211+c7full@gmail.com` / `Mindsetis!2026` (Member, вже зберіг ролі в онбордингу Mindsetter-а).
4. Подивіться на хедер і банер у кабінеті.
5. Натисніть «Continue Registration» у хедері.
6. Вийдіть і увійдіть як Mindsetter `romanloza211+t03@gmail.com` / `Mindsetis1Test`.
   **Очікуваний результат:** крок 2 — «Upgrade» у хедері і «Upgrade Now» у банері; крок 4 — «Continue Registration» у хедері, у банері текст «You’ve started upgrading to Mindsetter. Complete all sections of your profile to create events and host 1:1 consultation sessions.» і кнопка «Continue Registration»; крок 5 — відкривається «Your superpowers» (не «Your roles»); крок 6 — у хедері «Create Event», банера статусу немає.
   **Де ще подивитись:** ширина 375 — у хедері коротке «Continue»; акаунт із незавершеною анкетою Member-а (`romanloza211+t02@gmail.com` / `Mindsetis1Test`) — у хедері «Edit Profile».

## П6 (онбординг Mindsetter-а) — Back угорі ліворуч, «Save & Continue» закріплена внизу

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_За дзвінком 28.10 повертає Back онбордингу Mindsetter-а у верхній лівий кут (29.09 його переносили вниз, поруч із «Save & Continue»). Частина П6 про реєстрацію Member-а — окремо, ще відкрита._

### Зроблено

- Новий `components/mindsetter-onboarding/OnboardingTopBack.tsx` — Back над заголовком через `GuardedLink` (питає про незбережені зміни). Стоїть на всіх кроках: roles → кабінет, superpowers → roles, help → superpowers, shine → help (`app/[locale]/(app)/mindsetter-onboarding/{roles,superpowers,help,shine}/page.tsx:64/59/64/106`) і на всіх 8 необов'язкових блоках (`components/mindsetter-onboarding/BlockShell.tsx:36`).
- «Save and continue» у `StickyActionBar` — sticky внизу екрана, поки форма прокручується (`components/mindsetter-onboarding/StepActions.tsx:201`); на shine — «Skip» / «Continue fill» у тій самій панелі (`ShineForm.tsx:174`, на мобільному Continue згори).
- «TO TOP» прихована на маршрутах онбордингу, щоб не закривала кнопку (`components/layout/ScrollToTopButton.tsx:74`).

### Перевірено вживу

- 1440 (superpowers, roles): Back x=70, y=126 (Figma: ~x75, y124 під хедером); «Save and continue» 640 px, `position: sticky`, низ 884 при висоті вікна 900, у закріпленому стані з'являється верхня рамка 1px. Після перезапуску дев-сервера (свіжі стилі) цифри ті самі.
- 375 (superpowers, help, shine, блок My Wins): Back x=16, y=102; «Save and continue» 328 px, sticky, низ 800 при висоті 812; «TO TOP» на сторінці немає; горизонтального переповнення немає.
- Shine на 375 з одним вибраним блоком: «Continue fill (1 section)» над «Skip — fill later from cabinet» — як у мобільному макеті.
- Незбережені зміни: введений текст + Back / логотип / кнопка «назад» браузера → вікно «You have unsaved changes» (Stay / Leave); Leave — вихід, людина лишається Member-ом.
- Увесь шлях `r2v1`: roles → superpowers → help → shine → Skip, кожен Back веде на попередній крок, з roles — у кабінет.
- Консоль без помилок.

### Проблеми і питання

- Звірено з Figma: десктоп — за координатами з `MANIFEST.md` (Back ~x75 / y124); мобільний — з кадром `108:720` (Your superpowers): Back під хедером ліворуч (у макеті ~x22 / y95, у нас x16 / y102), «Save and continue» на всю ширину внизу; порядок кнопок shine на мобільному — як у `108:916`.
- На екрані Congrats Back немає (як і в мобільному макеті; на десктопному макеті він є) — ця правка Congrats не стосується.

### Як це протестувати

1. Увійдіть як `romanloza211+c7full@gmail.com` / `Mindsetis!2026` і натисніть «Continue Registration» у хедері.
2. Подивіться на лівий верхній кут під хедером і на низ екрана, прокрутіть форму.
3. Введіть будь-що в перше поле «Title» і натисніть «Back» угорі ліворуч.
4. У вікні натисніть «Stay», потім клацніть логотип Mindsetis у хедері, далі «Leave».
5. Натисніть «Continue Registration» ще раз, потім «Back» на «Your superpowers» і ще раз «Back» на «Your roles».
   **Очікуваний результат:** крок 2 — «← Back» угорі ліворуч, широка кнопка «Save and continue» тримається внизу екрана, поки ви прокручуєте; крок 3 — вікно «You have unsaved changes» з кнопками Stay / Leave; крок 4 — Leave веде на головну, у хедері досі «Continue Registration»; крок 5 — «Your roles», а з нього — кабінет.
   **Де ще подивитись:** ширина 375 — кнопка «TO TOP» на цих сторінках не з'являється і не закриває «Save and continue»; на «Make your profile shine.» (лише на новому акаунті, який дійшов до цього кроку, — не на `c7full`) поставте галочку — «Continue fill (1 section)» має стати над «Skip — fill later from cabinet». Нічого не зберігайте на `c7full`, щоб акаунт лишався в стані «почав онбординг».

## Т1 — пауза між повторними надсиланнями листів

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- Спільний годинник паузи `components/auth/resend-cooldown.ts` — 60 с (`:29`), окремо для листа підтвердження і листа скидання, прив'язаний до адреси; зберігається в `sessionStorage` (`:71`), тож переживає перезавантаження. Кнопка вимкнена й показує «Resend in 0:45».
- Пауза стартує одразу після першого листа: реєстрація (`components/auth/SignUpForm.tsx:77`), «Send reset link» (`ForgotPasswordForm.tsx:66`); і після кожного повторного: «Resend email» на 2/4 і на вході (`ResendConfirmationEmailButton.tsx:39,52,59`), «Resend link» (`ResendResetLinkButton.tsx:30,38,45`), сторінка «Link expired» (`LinkExpiredForm.tsx:79,96,104`).
- Це UX-захист; справжні ліміти — серверні (4 листи/год на адресу, Upstash) і ліміти Supabase.
- i18n: `auth.cooldown.wait` в `en.json` і `es.json`.

### Перевірено вживу

- 2/4 «Check your inbox» (375) одразу після реєстрації `r2v1`: «Resend in 0:57», вимкнена; після перезавантаження сторінки — «Resend in 0:41» (відлік продовжився).
- «Check your email» після «Send reset link» (1440 і 375): «Resend in 0:55», за хвилину — «Resend link», кнопка знову активна.
- «Link expired» (recovery, 1440): після «Resend reset link» — «Resend in 1:00», вимкнена.
- Консоль без помилок.

### Проблеми і питання

- Серверні ліміти (4/год) локально не діють — у `.env.local` немає Upstash; на проді вони запрацюють лише після I7.

### Як це протестувати

1. Вийдіть з акаунта, відкрийте `/forgot-password`, введіть будь-яку адресу і натисніть «Send reset link».
2. Подивіться на кнопку на екрані «Check your email».
3. Зачекайте хвилину.
   **Очікуваний результат:** крок 2 — кнопка сіра, напис «Resend in 0:5x» і зменшується щосекунди; крок 3 — кнопка знову «Resend link» і натискається.
   **Де ще подивитись:** реєстрація нового акаунта — на «Check your inbox» (2/4) кнопка «Resend email» так само з відліком, і після перезавантаження сторінки відлік продовжується, а не починається з 1:00; сторінка «Link expired» після «Resend reset link»; ширина 375.

## Т2 — помилки входу в i18n + посилання «Forgot password?»

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_Текст для незареєстрованої пошти — варіант A (рішення власника): той самий, що й для неправильного пароля._

### Зроблено

- `SignInForm` розпізнає код `unauthenticated` і показує власний локалізований текст «Incorrect email or password.» із посиланням «Forgot password?» на `/forgot-password?email=<ця адреса>` (`components/auth/SignInForm.tsx:89,124,126`). Однакова відповідь для неправильного пароля й невідомої пошти — нічого не розкриває.
- Решта помилок авторизації (ліміт, невалідна форма, внутрішня) — через `authErrorText` за кодом, а не англійським рядком із сервера (`components/auth/auth-errors.ts:24`; `SignInForm.tsx:94`, а також форми реєстрації, скидання, «Link expired»).
- `/forgot-password?email=…` підставляє адресу (перевірка `emailSchema`) — `app/[locale]/(app)/forgot-password/page.tsx:33,37`.
- Непідтверджена пошта: текст клієнтки «Please confirm your email to log in…» + «Resend email» (`auth.signIn.emailNotConfirmed`).
- i18n: `auth.signIn.invalidCredentials`, `auth.signIn.resetLink`, `auth.errors.generic`, `auth.errors.rateLimited` в `en.json` і `es.json`.

### Перевірено вживу

- `/login`, 1440: `c7full` + неправильний пароль → «Incorrect email or password.» + «Forgot password?» (посилання з адресою).
- 1440 і 375: незареєстрована адреса → те саме повідомлення; «Forgot password?» → `/forgot-password` з підставленою адресою → «Send reset link» → «If an account exists for …, a reset link is on its way. It is valid for 1 hour.»
- Непідтверджений `r2v1` (375) → «Please confirm your email to log in. We sent the link to … — or get a new one:» + «Resend email».
- Пошта з великими літерами й пробілами (` RomanLoza211+T03@GMAIL.com`) — вхід успішний.
- `/es/login` (375), невідома адреса → «Correo o contraseña incorrectos.»
- Консоль без помилок.

### Проблеми і питання

- Текст ліміту («Too many attempts…») вживу не викликати: локально немає Upstash, а ліміт Supabase на вхід за тест не спрацьовує. Перевірено в коді (`auth-errors.ts:24`) і наявністю ключа в обох мовах.

### Як це протестувати

1. Вийдіть з акаунта, відкрийте `/login`.
2. Введіть `romanloza211+c7full@gmail.com` і неправильний пароль, натисніть «Log in».
3. Замініть пошту на неіснуючу (наприклад `romanloza211+nobody@gmail.com`), натисніть «Log in».
4. Натисніть «Forgot password?» у червоному повідомленні.
   **Очікуваний результат:** кроки 2 і 3 — однакове червоне повідомлення «Incorrect email or password.» з посиланням «Forgot password?»; крок 4 — «Reset your password» з уже вписаною адресою.
   **Де ще подивитись:** ширина 375; `/es/login` — повідомлення іспанською («Correo o contraseña incorrectos.»).

## П7 — кнопка під відео і на першому екрані головної

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- Під відео («What you actually get here»): для **будь-якого** залогіненого стану (Member з незавершеною анкетою, Member, Member посеред онбордингу Mindsetter-а, Mindsetter) — одна кнопка **Meet People & Join Events** → поп-ап «каталог скоро» (каталогу ще немає) — `components/marketing/main-page/WhatIsMindsetis.tsx:147,160`. Гість — без змін, Apply to Join.
- Перший екран: усі залогінені стани — **Explore Community** → той самий поп-ап; гілку Mindsetter-а з Create Event прибрано — `components/marketing/main-page/HeroBand.tsx:264-271`. Create Event лишився тільки в хедері.
- i18n: новий `home.main.whatIsMindsetis.catalogCta` («Meet People & Join Events» / «Conoce gente y únete a eventos») в `messages/en.json:154` і `es.json`; більше не потрібний `nav.exploreMindsetis` прибрано з обох. Структура `en`/`es` збігається.

### Перевірено вживу

- Кожен стан окремим акаунтом, головна `/`:
  - гість (1440 і 375) — Apply to Join на першому екрані й під відео;
  - Member з незавершеною анкетою (`t02`, `/es`, 1440) — «Explorar comunidad» / «Conoce gente y únete a eventos», у хедері «Editar perfil»;
  - Member (`c7new`, 1440 і 375) — Explore Community / Meet People & Join Events, у хедері Upgrade;
  - Member посеред онбордингу Mindsetter-а (`c7full`, 1440) — те саме, у хедері Continue Registration;
  - Mindsetter (`t03`, 1440 і 375) — те саме; «Create Event» на всій сторінці трапляється рівно один раз — у хедері.
- Клік по обох кнопках відкриває «Network & events directory is coming soon» з «Got it».
- Розміри: під відео 302×56 по центру на 1440 (як «Apply to Join» у Figma `572:5427`), 328×56 на всю ширину на 375; перший екран 192×56 поруч із How it works на 1440, на 375 обидві 328×56 одна під одною. Горизонтального переповнення на 375 немає.
- Консоль: помилок немає; мережа: 4xx/5xx немає. `npm run typecheck`, `npm run lint` — чисто.

### Проблеми і питання

- Для залогінених обидві кнопки виглядають приглушено (стан «скоро» `NotYetAvailable`, як і раніше Explore Mindsetis) — коли з'явиться каталог, вони стануть звичайними посиланнями.
- Макета саме для залогінених станів цього блоку у Figma немає — звіряв із гостьовим кадром.

### Як це протестувати

1. Вийдіть з акаунта (або відкрийте інкогніто) і відкрийте головну `/`.
2. Подивіться на кнопки першого екрана й кнопку під відео «What you actually get here».
3. Увійдіть на `/login` як `romanloza211+c7new@gmail.com` / `Mindsetis!2026` і відкрийте `/`.
4. Подивіться на ті самі дві кнопки й натисніть кнопку під відео.
5. Вийдіть і увійдіть як Mindsetter `romanloza211+t03@gmail.com` / `Mindsetis1Test`, відкрийте `/`.
6. Подивіться на хедер, перший екран і кнопку під відео.
   **Очікуваний результат:** крок 2 — Apply to Join в обох місцях; крок 4 — на першому екрані «Explore Community», під відео «Meet People & Join Events», клік відкриває вікно «Network & events directory is coming soon»; крок 6 — у хедері «Create Event», а на першому екрані й під відео — ті самі «Explore Community» і «Meet People & Join Events», другої кнопки Create Event на сторінці немає.
   **Де ще подивитись:** ширина 375 — кнопки на всю ширину; акаунт посеред онбордингу Mindsetter-а (`romanloza211+c7full@gmail.com` / `Mindsetis!2026`) — ті самі кнопки, у хедері Continue Registration; `/es` — «Explorar comunidad» і «Conoce gente y únete a eventos».

## П8 — анкета амбасадора: однакові кроки для гостя й залогіненого

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- Три питання й їхній порядок однакові для всіх; відрізняється лише крок контактів (`components/marketing/main-page/AmbassadorApplicationDialog.tsx:185-210`):
  - гість — 4 кроки, на 4-му ім'я, прізвище, email (як було);
  - залогінений, у профілі є ім'я й прізвище — **3 кроки**, «Submit application» на 3-му питанні, під ним рядок «We'll send this application from your account: … (email)» (`:371`, `:492`); старого 4-го кроку «Your details» більше немає;
  - залогінений, у профілі бракує імені чи прізвища — 4-й крок «Add the details missing from your profile» лише з відсутніми полями, email не питаємо (`:353`; список відсутніх полів рахує сервер — `components/marketing/main-page/AmbassadorsSection.tsx:126-129`).
- Сервер (`app/[locale]/actions.ts:289-304`): ім'я й прізвище з профілю, email з акаунта; введене в формі приймається лише для поля, якого в профілі немає, і перевіряється тією ж схемою `ambassadorContactSchemaFor` (`lib/validation/ambassador-application.ts:46`). Заглушку «—» для порожнього прізвища прибрано. Телефону в профілі немає (колонки `phone` немає), тож «усі контакти з профілю» = ім'я, прізвище, email.
- Лічильник «Step N of M» і прогрес рахуються від реальної кількості кроків; текст вступу без «and your contact details», коли кроку контактів немає.
- i18n: `stepLabel`, `intro.subtitleSignedIn`, `details.signedInTitle`, `details.signedInMissing` в `en.json` і `es.json`; старі покрокові `stepLabel` прибрано.

### Перевірено вживу

- Mindsetter `t03` (1440): «Get started» → Step 1 of 3 … Step 3 of 3, на 3-му «Back» + «Submit application» і рядок «…from your account: Roman Mindsetter (romanloza211+t03@gmail.com)». Не відправляв.
- Mindsetter `r2v1` (375): три відповіді → «Submit application» на Step 3 of 3 → «APPLICATION RECEIVED / Thanks — we've got your application.». У базі (тестовий проєкт) з'явився рядок `ambassador_applications`: `applicant_type = mindsetter`, ім'я «Verifier», прізвище «Rtwo» з профілю, email і `user_id` акаунта, три відповіді; у черзі листів — `ambassador_application` для цієї адреси. POST — 200.
- Member `c7new` (порожні ім'я й прізвище в профілі, 1440): Step 4 of 4 «Add the details missing from your profile», лише First name і Last name, текст «We'll reply to romanloza211+c7new@gmail.com.»; порожній Submit → «First name is required.» / «Last name is required.», запиту на сервер немає.
- Гість (375): Step 1 of 4 … Step 4 of 4 «Where should we send our reply?» з трьома полями і рядком про Privacy Policy; порожній Submit → три помилки під полями.
- Порядок питань однаковий у всіх: moderation → business clubs → what worked well.
- Консоль без помилок. `typecheck` / `lint` — чисто.

### Проблеми і питання

- Збірку, на якій клієнтка бачила «старе питання на 4-му кроці», не відтворював — у коді до правки його вже не було (там був крок «Your details» з одним рядком); тепер для залогіненого з повним профілем 4-го кроку немає взагалі.
- Звичайна реєстрація (`/join` → `/sign-up`) цією правкою не зачеплена — її сценарії пройдено в П1/П2/П3.
- Лист-підтвердження заявки поставлено в чергу (`pending`); доставку в скриньку я не бачив — це перевіряє власник.
- У Figma на 5-му кадрі анкети є необов'язкове поле Phone number — у формі гостя його немає (рішення 29.09); залогіненого телефон не стосується, бо його немає в профілі.
- Тестова заявка `r2v1` лишилась у таблиці `ambassador_applications` (тестовий Supabase) — за потреби видаліть.

### Як це протестувати

1. Увійдіть як `romanloza211+t03@gmail.com` / `Mindsetis1Test` і відкрийте `/`.
2. Прокрутіть до блоку амбасадорів і натисніть «Apply for Ambassadorship», потім «Get started».
3. Двічі натисніть «Next».
4. Закрийте вікно хрестиком (нічого не відправляйте), вийдіть з акаунта.
5. Як гість відкрийте `/`, натисніть «Apply for Ambassadorship» → «Get started» і тричі «Next».
6. Натисніть «Submit application», не заповнюючи полів.
7. Вийдіть і увійдіть як `romanloza211+c7new@gmail.com` / `Mindsetis!2026` (у профілі немає імені), повторіть кроки 2–3 і натисніть «Next» ще раз.
   **Очікуваний результат:** крок 3 — угорі «Step 3 of 3», кнопки «Back» і «Submit application», під полем «We'll send this application from your account: Roman Mindsetter (romanloza211+t03@gmail.com).»; крок 5 — «Step 4 of 4», «Where should we send our reply?» з полями First name / Last name / Email; крок 6 — під кожним полем червона помилка; крок 7 — «Step 4 of 4», «Add the details missing from your profile», лише First name і Last name, поля Email немає.
   **Де ще подивитись:** ширина 375 — на 3-му кроці «Submit application» над «Back», обидві на всю ширину; якщо хочете перевірити відправку — заповніть і відправте з акаунта Mindsetter-а: має з'явитися «Thanks — we've got your application.» і прийти лист.

## П9 — поле INDUSTRY у профілі Member-а

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_Скасовує E5 релізу 1 (індустрію тоді прибрали з публічних профілів)._

### Зроблено

- Публічний профіль Member-а (`/members/[username]`) знову вибирає `industries`, `industry_custom`, `industry_custom_status` і одразу на сервері перетворює їх на готові підписи (`app/[locale]/(app)/members/[username]/page.tsx:43,59`); сирі колонки до компонента й у браузер не потрапляють.
- `resolveIndustryLabels` (`components/profile/MemberProfileView.tsx:284-290`): назви з каталогу; власний текст «Other» показується лише при `industry_custom_status = 'approved'`, інакше відкидається.
- Окрема пігулка під company/role — варіант A з Figma (`1642:23098`): «INDUSTRY | 💼 Technology, Marketing», біла, рамка 1 px градієнтом бренду, радіус 12 (`MemberProfileView.tsx:432-436`, `MemberProfileView.module.css:107`); нова іконка `components/icons/briefcase-fill-icon.tsx`. Без індустрій пігулки немає.
- Пігулки company/role — 24 px заввишки, як у поточному макеті (було 28).
- i18n: `profile.industry` («INDUSTRY» / «SECTOR») в `en.json:1108` і `es.json`; підказка у формі індустрій тепер каже, що вони видні в профілі.

### Перевірено вживу

- Власний профіль `c7full` (`/members/romanloza211c7full`), 1440: пігулка x70 y500, 291×24, радіус 12, рамка 1 px з градієнтом; «INDUSTRY» 11 px bold, розрядка 3.3 px (30 %), сірий #a5a5a5; значення «Technology, Marketing» 14 px чорні; іконка 14×14 блакитна; на 10 px нижче пігулок «Mindsetis Labs» / «Head of Community» (24 px). Збігається з Figma `401:6375` / `1642:23098`.
- Те саме на 375: 270×24, значення 12 px чорні, без переповнення.
- Профіль без індустрій (`c7new`) — пігулки немає.
- Негатив (модерація): `resolveIndustryLabels` прогнав напряму — `other` + `pending` / `rejected` → лише «Consulting», власний текст відкинуто; `approved` → «Approved Niche, Consulting»; невідомий slug пропускається. HTML сторінки не містить `industry_custom`.
- Консоль без помилок; сторінка — 200.

### Проблеми і питання

- Мобільна пігулка в Figma (`1751:38850`) має білий текст значень, на світлому профілі він невидимий — узяли чорний, як на десктопі. Мобільні кадри профілю Member-а (`48:567`, `401:8282`) пігулки INDUSTRY ще не мають — розмір шрифту взято з варіанта `1751:38850`.
- Живого Member-а зі схваленим або непереглянутим власним текстом «Other» у тестовій базі немає (є лише Mindsetter `t03`), тому модерацію перевірено напряму на функції, а не на сторінці.
- ❓ Клієнтці: чи потрібна індустрія і в профілі Mindsetter-а (зараз там її немає).

### Як це протестувати

1. Увійдіть як `romanloza211+c7full@gmail.com` / `Mindsetis!2026`.
2. Відкрийте `/members/romanloza211c7full`.
3. Подивіться під пігулки «Mindsetis Labs» і «Head of Community».
4. Відкрийте `/members/romanloza211c7new` (у цього Member-а індустрії не вказані).
   **Очікуваний результат:** крок 3 — окрема біла пігулка з тонкою блакитною рамкою: сірим «INDUSTRY», вертикальна риска, блакитна іконка портфеля і чорним «Technology, Marketing»; крок 4 — такої пігулки немає.
   **Де ще подивитись:** ширина 375 — пігулка вміщується в рядок, текст значень чорний, не білий.

## П10 — автофокус на пошуку в полях Country / City

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято

### Зроблено

- `Combobox` із пошуком більше не гасить автофокус Radix: при відкритті курсор одразу в рядку пошуку (`components/ui/combobox.tsx:269`); без пошуку — як раніше, фокус лишається на полі.
- Рядок пошуку 16 px на мобільному (`components/ui/command.tsx:66`), щоб iOS Safari не збільшував сторінку при фокусі; на десктопі 14 px, як було.
- Зачіпає всі комбобокси з пошуком: Country і City в «Set your identity» та в кабінеті (Hero), часовий пояс у Sessions Setup. Нових ключів i18n немає.

### Перевірено вживу

- `t02` (анкета не завершена), `/member-profile`, 1440: клік по Country → фокус у «Search countries…», одразу набрав «Ukr» → у списку лише «Ukraine», Enter вибирає. Клік по City → фокус у «Start typing your city…», набрав «Ode» → запит `/api/geo/cities?q=Ode&country=UA` (200) → «Odesa».
- 375: Country → фокус у пошуку, шрифт 16 px; список під полем (y355, 328×302 при висоті екрана 812), набір «Sp» фільтрує; горизонтального переповнення немає.
- Escape закриває список, фокус повертається на поле.
- Нічого не зберігав (анкета `t02` лишилась незавершеною).
- Консоль без помилок; мережа — 200.

### Проблеми і питання

- Поведінку справжньої екранної клавіатури телефона (чи не закриває вона список) у браузері на комп'ютері не відтворити — це крок для власника на телефоні.
- Поле «Language you speak» на тому ж екрані — окремий компонент (`LanguagesMultiSelect`), автофокусу на його пошуку немає. Клієнтка просила лише Country / City; ❓ чи робити так само й для мов.

### Як це протестувати

1. Увійдіть як `romanloza211+t02@gmail.com` / `Mindsetis1Test` — відкриється «Set your identity» (`/member-profile`).
2. Клацніть поле Country.
3. Не клацаючи більше нікуди, наберіть на клавіатурі «Ukr».
4. Натисніть Enter.
5. Клацніть поле City і одразу наберіть «Ode».
   **Очікуваний результат:** крок 2 — список відкрився, курсор уже блимає в рядку «Search countries…»; крок 3 — у списку лишилась «Ukraine»; крок 4 — у полі Country «Ukraine»; крок 5 — курсор одразу в «Start typing your city…», у списку з'являється «Odesa». Не натискайте Continue, щоб анкета лишилась незавершеною.
   **Де ще подивитись:** на телефоні (ширина 375) — після дотику до Country одразу відкривається клавіатура, сторінка не збільшується, і список видно над клавіатурою (або його можна прокрутити).

## П11 — профіль Member-а: свій → Share, чужий → Invite to event

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_Скасовує G3 релізу 1 у частині Member («Share у Member — не робимо»)._

### Зроблено

- Сторінка визначає власника на сервері (`app/[locale]/(app)/members/[username]/page.tsx:169`) і лише для нього будує абсолютну адресу профілю `siteUrl(localePath(...))` (`:187`), як у профілі Mindsetter-а.
- На своєму профілі замість «Invite to event» — робоча кнопка Share (`components/profile/MemberProfileView.tsx:465-480`): той самий `ShareProfileButton`, що в профілі Mindsetter-а — системне меню «Поділитися», а де його немає — копіювання посилання з тостом. Іконка 44×44, видна на всіх ширинах.
- На чужому профілі — «Invite to event», як і раніше (поп-ап «скоро», лише від `md`, `:495`).
- i18n: `profile.share.ariaLabel / linkCopied / copyFailed` в `en.json` і `es.json`.

### Перевірено вживу

- Власник `c7full`, `/members/romanloza211c7full`, 1440: кнопка «Share this profile» x70 y548, 44×44, «Invite to event» немає. Клік передає в системне меню `{ title: "Olena Kovalenko", url: "http://localhost:3000/members/romanloza211c7full" }`; без системного меню — у буфер копіюється та сама адреса й з'являється тост «Link copied to clipboard».
- Той самий профіль на 375: Share 44×44 під пігулками, переповнення немає.
- Відвідувач: `c7full` відкриває чужий `/members/romanloza211c7new` — 1440: «Invite to event» 188×56, Share немає; 375: ні Invite, ні Share (Invite на мобільному прихований, як і до правки — так у мобільному макеті).
- Консоль без помилок; сторінки — 200.

### Проблеми і питання

- У Figma кнопки Share на профілі Member-а немає ніде — розмір, вигляд (іконка без підпису) і місце (слот Invite) обрали ми.
- ❓ Клієнтці: чи потрібна повна кнопка з підписом «Share Profile» замість іконки (у доці — «кнопка Share Profile»).
- ❓ Клієнтці: на телефоні на чужому профілі «Invite to event» не показується (його немає в мобільному макеті) — показувати?
- Окремо, не з цієї правки: на чужому профілі з дуже довгим ім'ям без пробілів (`romanloza211c7new`, 1440) заголовок залазить на фото.

### Як це протестувати

1. Увійдіть як `romanloza211+c7full@gmail.com` / `Mindsetis!2026`.
2. Відкрийте свій профіль `/members/romanloza211c7full`.
3. Натисніть квадратну кнопку зі значком «поділитися» під пігулкою INDUSTRY.
4. Відкрийте чужий профіль `/members/romanloza211c7new`.
   **Очікуваний результат:** крок 2 — під пігулками кнопка-іконка «поділитися», кнопки «Invite to event» немає; крок 3 — відкривається системне вікно «Поділитися» з посиланням на профіль, або (якщо браузер його не має) унизу з'являється «Link copied to clipboard» і посилання на профіль уже в буфері; крок 4 — кнопка «Invite to event» є, кнопки «поділитися» немає.
   **Де ще подивитись:** ширина 375 — на своєму профілі кнопка «поділитися» є, на чужому «Invite to event» на телефоні немає (див. питання вище); на телефоні натискання відкриває системне меню «Поділитися».

## П12.2 — темний фірмовий стиль системних листів

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_Ч.1 (аватар відправника) — не код, дія власника: варіанти й вимоги — у `docs/release-2-tasks.md`, блок 0, «П12.1»._

### Зроблено

- Обидва набори листів — 5 шаблонів Resend (`lib/email/templates/base-layout.tsx`) і 5 шаблонів Supabase Auth (`supabase/templates/build.mjs` → `*.html`):
  - суцільний чорний фон навколо прибрано: `body` і обгортка прозорі — навколо картки фон самої пошти;
  - картка `#1a1a1a` (колір карток сайту) до 600 px (`base-layout.tsx:34`, `build.mjs:41`; атрибут `width="600"` для Outlook), радіус 12, рамка 1 px `#333` (`base-layout.tsx:140-141`, `build.mjs:189`);
  - фіксація кольору проти перефарбування в темній темі Gmail: `background-color` + однаковий `background-image: linear-gradient(…)` на картці й кнопці (`base-layout.tsx:44`, `build.mjs:51`), `bgcolor` для Outlook; `color-scheme: light dark` (`base-layout.tsx:60`);
  - текст і кнопка — HTML; логотип — PNG 600×81 з альфа-каналом, показ 300 px, `alt="Mindsetis"` (`base-layout.tsx:165`, `build.mjs:206`).
- `supabase/templates/README.md` — розділ «Look (P12.2)» з переліком ручних перевірок. Залежностей і міграцій немає.

### Перевірено вживу

- Усі 10 листів відрендерено тим самим шляхом, що й у застосунку (`render` з `@react-email/components` через реєстр шаблонів; шаблони Supabase — `build.mjs`, результат байт-у-байт збігається з закомміченими `.html`) і відкрито в Chrome на ширинах 640 і 375, у світлій і темній схемі (40 знімків):
  - 640: картка 600 px по центру; 375: 359 px з відступом 8 px, без горизонтального переповнення;
  - радіус 12 px, рамка 1 px `rgb(51,51,51)`, фон картки `rgb(26,26,26)`; фон `body` прозорий — у світлій схемі навколо біле, у темній темне;
  - кнопка — HTML-посилання з текстом (Confirm email / Reset password / Sign in / Confirm new address / Accept invitation / Open Mindsetis / Go to Mindsetis Community / Create your account), блакитна `#79b9e3`, текст чорний;
  - логотип завантажується (600 px натурально, 300 px показ), alt «Mindsetis».

### Проблеми і питання

- Справжні поштові клієнти тут не перевірити — лише власник (кроки нижче). Фіксація кольору в Gmail iOS/Android — «найкраща спроба», як і попереджала клієнтка.
- Шаблони Supabase треба вручну вставити в дашборд **кожного** проєкту (дев і прод) — разом з I2.
- Логотип і далі лежить у Storage тестового проєкту (`lslkbqoedrpnuwtqlvio`) — відомий пункт блоку I релізу 1, не цієї правки.
- Колір картки — `#1a1a1a` (як на сайті), а не `#14181D` з прикладу клієнтки.

### Як це протестувати

1. Вставте 5 шаблонів із `supabase/templates/*.html` у Supabase → Authentication → Email Templates (дев-проєкт), як описано в `supabase/templates/README.md`.
2. Зареєструйте новий акаунт на `/join` своєю поштою — прийде лист підтвердження.
3. Запросіть скидання пароля на `/forgot-password` — прийде лист скидання.
4. Відправте анкету амбасадора з головної гостем на іншу свою адресу, під якою акаунта немає, — прийде лист Resend (черга листів).
5. Відкрийте ці листи в Gmail (веб, iPhone, Android), Apple Mail і Outlook — у світлій і темній темі пошти.
   **Очікуваний результат:** у кожному клієнті — темна картка до 600 px із заокругленими кутами й тонкою сірою рамкою, навколо неї — звичайний фон пошти (білий у світлій темі, темний у темній), без широкого чорного прямокутника; угорі логотип Mindsetis (якщо картинки вимкнені — слово «Mindsetis»); текст можна виділити; кнопка — блакитна з чорним текстом. У темній темі Gmail на телефоні картка лишається темною, а кнопка — блакитною (якщо ні — це межа можливостей Gmail, не помилка).
   **Де ще подивитись:** вузький екран телефона — картка на всю ширину з відступом ~8 px, текст не обрізаний; Outlook для Windows — картка має бути 600 px, кути там можуть бути прямими (Outlook не вміє заокруглення).

## П13 — футер за макетом Альбіни

**Дата:** 2026-10-30 · **Вердикт:** ✅ Прийнято
_За рішенням власника — «як відмальовано в дизайні». Правки Анастасії до макета ще не прийшли — коли прийдуть, це буде нова задача._

### Зроблено

- `components/layout/Footer.tsx` — повністю за Figma `1706:26218` (десктоп) / `1780:37290` (мобільний), замість шаблону Relume із заглушками:
  - лого (іконка + градієнтний напис, `public/images/footer/mindsetis-logo.svg`), форма розсилки, новий текст згоди з посиланням на Privacy Policy, 4 соцмережі — LinkedIn, Instagram, Threads, YouTube (`:37-40`);
  - колонки Platform / Company / Membership (`:59-85`), заголовки градієнтом бренду;
  - лінія, «© 2026 Mindsetis. All rights reserved.», Privacy Policy / Terms of Service / Cookies Settings (`:270-298`);
  - заголовок «Join our newsletter…» лише на мобільному, як у макетах; дві колонки з `xl` (1280), нижче — стопкою, посилання трьома колонками від `sm`.
- Куди ведуть: Home → `/`, Become a Member → `/join`, Contact Us → `mailto:support@mindsetis.com`; Catalog, Events, Become a Mindsetter — наявні поп-апи «скоро»; About Us, FAQs, Community Guidelines і всі соцмережі — новий поп-ап `components/layout/FooterSoon.tsx` («… is on the way»), бо сторінок і адрес профілів немає.
- Нижній відступ футера більший за макет (78 / 86 px), щоб «TO TOP» не закривала «Cookies Settings».
- Мінімальний футер заглушки (`829:4803` / `866:5531`) — в один рядок 14 px.
- i18n: `footer.nav.*`, `footer.comingSoon.*`, `footer.social.threads`, новий `footer.newsletter.consent` в `en.json` і `es.json`; заглушкові `columns.*`, Facebook, X, «Follow Us» прибрано.

### Перевірено вживу

- 1440 (`/privacy-policy`, ширина вмісту 1425 через смугу прокрутки): лого x70 y70 176×32; поле 357×56 і Subscribe 127×56 на x443; згода сіра на y198; соцмережі 32×32 на x70/114/158/202, y269 — збігається з Figma до 1–2 px. Колонки на x765 / 975 / 1185 (у Figma 779 / 989 / 1199 — різниця = 15 px смуги прокрутки), посилання по 38 px.
- 1024: стопка — лого, заголовок розсилки, форма, соцмережі, потім три колонки поруч (x70 / 373 / 676), юридичний рядок в одну лінію; переповнення немає.
- 375: усе в стовпчик, як у мобільному макеті (заголовки колонок y340 / 510 / 680 проти ~345 / 513 / 681 у Figma), згода біла, юридичні посилання в рядок під ©; переповнення немає; «TO TOP» не перекриває «Cookies Settings».
- Кліки: About Us → «About Us is on the way»; LinkedIn → «Our LinkedIn page is on the way»; Become a Member для залогіненого з незавершеною анкетою (`t02`) → `/join` → повертає на `/member-profile`.
- Консоль без помилок.

### Проблеми і питання

- Відхилення від макета (прийнятні): на 1440 лінія над © на 36 px вища (між соцмережами й лінією 70 px замість ~107 у Figma), а відступ під © більший (заради «TO TOP»); на 1024 макета немає — використано стопку.
- Мінімальний футер живцем не бачив: він показується лише в режимі заглушки (`COMING_SOON_MODE`), який вимкнено.
- ❓ Чекаємо: адреси LinkedIn / Instagram / Threads / YouTube; куди вести «Become a Mindsetter» для гостя; чи ховати «Become a Member» для залогінених; правки Анастасії до макета.
- Надпис «Terms of Service» веде на сторінку «Terms of Use» — так у макеті.

### Як це протестувати

1. Відкрийте будь-яку сторінку, наприклад `/privacy-policy`, і прокрутіть до низу.
2. Порівняйте футер із макетом: лого, поле «Enter your email» + Subscribe, текст згоди, 4 іконки, колонки Platform / Company / Membership, лінія, © і три посилання.
3. Натисніть «About Us».
4. Закрийте вікно і натисніть іконку LinkedIn.
5. Закрийте вікно і натисніть «Contact Us».
   **Очікуваний результат:** крок 2 — футер як у макеті Альбіни, без «Column One», Facebook і X; крок 3 — вікно «About Us is on the way»; крок 4 — «Our LinkedIn page is on the way»; крок 5 — відкривається поштова програма з адресою support@mindsetis.com.
   **Де ще подивитись:** ширина 375 — усе в один стовпчик, над формою заголовок «Join our newsletter to stay up to date on features and releases.», кнопка «TO TOP» не закриває «Cookies Settings»; планшет (~1024) — колонки посилань у три стовпчики під формою.
