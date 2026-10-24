# Визуальная система журнала · версия 6

## Референсы и направление

Новые скриншоты Nexora и Atlas: холодный светлый серый фон, чистые белые панели, небольшие скругления внутри более мягких панелей, оранжевый акцент действия, голубая аналитика, светлая изометрическая сцена. Темная тема Solar Gate/Ripple не переносилась: пользователь ранее явно попросил светлый интерфейс.

Точный шрифт в скриншотах не указан. Для близкого по пластике интерфейса выбран **Onest**, variable 100–900, с полноценной кириллицей. Все основные и второстепенные надписи получили самостоятельный контраст и размеры; цвет фона не используется для важных текстов. Источник: https://github.com/google/fonts/tree/main/ofl/onest . Лицензия: `fonts/Onest-OFL.txt`. Шрифт размещен локально в `fonts/Onest.woff`; сетевые сервисы шрифтов не требуются.

## Композиция

- Плавающая верхняя навигация и компактный выбор группы.
- В телефоне — свайп между группами, соседняя группа видна, навигация закреплена снизу.
- Журнал — сцена академии и настоящие показатели ответов, долгов и заполнения отметок.
- Проведенное занятие получает более компактную обложку и сразу рабочую ведомость.
- Рейтинг — светлая панель лидера, график посещений и ответов, блок показателей, топ 3 и таблица всех студентов.
- Пустые показатели не подменяются демонстрационными именами, процентами или результатами.

## Изображение

`public/academy-campus.webp`, 1536×1024, оригинальная иллюстрация. Создана встроенным imagegen; сохранена в WebP quality 87. Не является изображением реального здания СГЮА. Все счетчики, формы, графики и карточки поверх сцены — настоящие HTML/SVG-компоненты.

Точный запрос:

> Use case: stylized-concept. Asset type: wide background illustration for a real light academic attendance dashboard, not a UI mockup. Primary request: a meticulous premium isometric architectural model of a contemporary law academy learning campus, in the visual language of clean white and icy blue industrial digital-twin scenes. Scene: a coherent broad miniature campus on a pale cool-gray ground plane: a low three-storey modern library with glass blue window grids on the right, open-roof teaching rooms with orderly rows of desks in the middle, a lecture auditorium with gently curved stepped seating on the left, landscaped courtyard paths and a few very simple white sculptural trees. A single restrained vivid orange wayfinding line connects the buildings across the courtyard; small orange seats punctuate otherwise white and light-blue spaces. No people. Composition: wide horizontal, isometric orthographic camera from above, detailed model occupies most of image with generous pale gray negative space at far left and top suitable for floating interface cards. Architecture is precise and beautiful, realistic scale-model photography and high-end 3D rendering, matte ceramic white buildings, cool powder-blue glass, satin aluminum details, soft ambient occlusion, diffused studio daylight, soft clear shadows. Color palette: near-white, cool gray #E9EBEF, powder blue #BDD4E9, very restrained orange #FF6314 accents. Make architecture feel quietly sophisticated, calm, and credible, no sci-fi. Background an even very light cool gray fading smoothly to #E9EBEF at edges. Landscape 1536x1024. Constraints: absolutely no text, letters, numbers, logo, UI panels, dashboard widgets, diagrams, buttons, fake data, screens, devices, watermarks, black background, gold or teal. This is an original illustrative miniature academy, not an actual identified building.

## Сохранение

`storage.ts` и `rating.ts` не изменялись. Схема данных и ключ `sgua-journal-v1` сохранены. Запись на устройстве, копии JSON и восстановление продолжают работать. Тестовые записи существуют только во внутреннем адресе проверки; в публичную сборку они не входят.
