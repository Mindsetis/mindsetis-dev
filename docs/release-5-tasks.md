# Реліз 5 — «Mindsetis. Super final»

> Джерело: Google Doc «Mindsetis_Edits_2026_October», новий верхній розділ «Mindsetis. Super
> final — Що ще я не додивилась» (прочитано 10.11.2026):
> https://docs.google.com/document/d/1ZR-zRVTVqb69vdveeY58KMiMn4Q70bA4_VouCpWGFrE/edit
> Решта документа — «Правки 3.0», зроблені в релізі 2 (`docs/release-2-tasks.md`).
>
> Гілка `feature/rel5-super-final` від `main` `f7cca50`. Міграцій немає.

## Легенда

`- [ ]` todo · `- [~]` зроблено, чекає ручного тесту · `- [x]` прийнято власником

## Задачі

- [~] **Н1. Футер: соцмережі.** LinkedIn, Instagram, Threads (особисті акаунти засновниці) і YouTube
  `@mindsetisoriginals` — справжні посилання в новій вкладці замість вікна «on the way».
  Адреси в одному місці: `lib/config/brand-links.ts`.
- [~] **Н2. Mindsetis Originals.** Перша картка (REALITY SHOW): фото й «Watch» відкривають відео
  «MINDSETTERS. Business Reality Show. Episode 1» на YouTube у новій вкладці. Аватар з іменем на
  всіх трьох картках веде на `/mindsetters/anakondra`. Картки 2–3 і «All videos» лишають вікно
  «on the way» (рішення власника).
- [~] **Н3. «All interviews with Mindsetters» — своє посилання в кожного.** Нове необов'язкове поле
  «All your interviews» у блоці «Video blog» (онбординг і кабінет), лягає в той самий
  `mindsetter_profiles.video_blog` (без міграції). Заповнене — кнопка відкриває посилання в новій
  вкладці; порожнє — кнопки немає. Кнопка живе в блоці відео, тож без відео її теж немає (так і
  написано в підказці під полем). На сторінці посилання ще раз перевіряється як http(s).
  **Після викладки:** заповнити поле клієнтці плейлистом MINDSETTERS (дев і прод).
- [~] **Н4. TOP MINDSETTERS, картка клієнтки.** Живі дані з її профілю: ім'я, роль + **перша**
  компанія до коми (рішення власника → «Founder, Mindsetis»), місто, мови. Веде на її сторінку.
  Фото лишилось теперішнє (картка 3:4, аватар квадратний). Якщо профіль недоступний — показує
  запасний текст зі словника й відкриває вікно, як інші картки (а не посилання на 404).
- [~] **Н5. TOP MINDSETTERS, картки 2–6:** Liam Vance, Alex Moretti, Sophie Laurent, Tetiana
  Pikhota, Maya Lindqvist (підписи й міста клієнтки, мови — наші: EN; EN/PT/IT; EN/FR; EN/UA;
  EN/SV).
- [~] **Н6. Вікно «Mindsetter Directory launches soon».** Відкривається кліком на картки 2–6 і на
  «Find your mindsetter». Кнопка «Apply to become a Mindsetter» веде за тим самим правилом, що й
  картка «Become a Mindsetter» (`resolveBecomeMindsetterHref`): гість → `/join`; недореєстрований
  Member → його крок; Member → онбординг Майндсеттера; розпочатий онбординг → останній крок.
  Майндсеттер бачить лише «Got it». Hero «Explore Community» і кнопка під відео лишили старе вікно.
- [~] **Пит. 5. Амбасадори:** картка з тим самим фото — «Tetiana Pikhota, Founder, AXIS».

Іспанські тексти — для всього нового.

## Ручний тест (після викладки на дев)

1. **Футер** будь-якої сторінки → 4 іконки відкривають LinkedIn, Instagram, Threads, YouTube у
   новій вкладці.
2. **Головна → Mindsetis Originals**, перша картка: клік на фото → відео на YouTube; «Watch» → те
   саме відео; клік на аватар/ім'я → сторінка `anakondra`. Картки 2–3 «Watch» і «All videos» →
   вікно «on the way».
3. **Головна → TOP MINDSETTERS:** перша картка — «Anastasiia Kondratska / Founder, Mindsetis /
   Kyiv, Ukraine / EN / UA» (дані з профілю), клік → її сторінка. Картки 2–6 — нові люди; клік →
   вікно «Mindsetter Directory launches soon». «Find your mindsetter» → те саме вікно.
4. **Кнопка у вікні:** без входу → «Apply to become a Mindsetter» веде на `/join`; акаунтом Member →
   на онбординг Майндсеттера; акаунтом Майндсеттера — кнопки немає, лише «Got it».
5. **Кабінет Майндсеттера → Video blog:** нове поле «All your interviews». Вставити плейлист →
   Save → на своїй сторінці в блоці відео з'являється «All interviews with Mindsetters» (десктоп —
   під заголовком, телефон — під відео) і відкриває плейлист. Очистити поле → кнопки немає.
   Ввести не-адресу → помилка під полем.
6. **Амбасадори** на головній: перша картка — «Tetiana Pikhota, Founder, AXIS».
7. Те саме в **/es** — тексти іспанською.

## Перевірено розробкою (10.11.2026, локально, Chromium 1440 і 375 px)

- Typecheck, lint, Prettier; ключі `en.json` / `es.json` збігаються (1435).
- Футер, Originals, вікно (гість → `/join`; Майндсеттер — без кнопки), перша картка з живими
  даними (на локальному сайті перевіряли на тестовому Майндсеттері — у тестовій базі `anakondra`
  немає), поле в кабінеті: збереження, кнопка на десктопі й телефоні, приховування, відмова на
  `javascript:…`. Іспанська версія вікна на 375 px без горизонтальної прокрутки.
- **Не перевірено вживу:** кнопка вікна для Member-а — обидва локальні тестові акаунти вже
  Майндсеттери; логіка та сама, що в картці «Become a Mindsetter».
