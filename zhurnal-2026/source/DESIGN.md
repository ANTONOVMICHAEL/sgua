# Визуальная система журнала

## Направление

Предоставленные пользователем скриншоты ZeBeyond использованы как референс композиции, контраста, строгой типографики, материалов и насыщенного бирюзового акцента. Исходные макеты, изображения устройств и чужой интерфейс не копировались. Журнал сохраняет светлую тему, собственную структуру и действующие функции.

## Шрифт

Inter, variable, normal. Официальный источник: https://github.com/google/fonts/tree/main/ofl/inter . Локальный файл `fonts/Inter.woff` содержит кириллицу, латиницу, знаки пунктуации и используемые символы. Исходник — `Inter[opsz,wght].ttf`; подмножество собрано fontTools без изменения рисунка знаков. Лицензия: `fonts/Inter-OFL.txt`.

## Предметная графика

Файл приложения: `public/folio-metal.webp`. Создан встроенным imagegen, затем сохранен в WebP с альфа-каналом для оптимизации загрузки. Исходное изображение 1536 × 1024. В приложение не вшиты изображения таблиц или оценок: все интерфейсные элементы и показатели остаются настоящими компонентами.

Точный запрос:

> Use case: stylized-concept. Asset type: one premium 3D object for a real academic journal web application. Create a meticulous photoreal studio product render of a contemporary open book sculpted from brushed aluminum and pale satin silver metal. The book is an elegant architectural object: two broad gently curved symmetrical page-wings, a narrow central polished spine, fine layered sheet edges along the front. A single very thin translucent deep-turquoise glass sheet is nested among the silver pages. The object should feel like a refined engineered instrument, not a fantasy trophy. View in three-quarter perspective from above, book rotated about 25 degrees on a horizontal plane, the full object visible with generous space around it. Low compact broad silhouette. Museum-quality industrial design, realistic machined edges, subtle micrograin, softbox reflections, crisp highlights, physically plausible surfaces and shadows. Studio white light with extremely restrained green/turquoise bounce at the central fold. Isolated on a genuinely transparent background with soft natural contact shadow only; no floor, backdrop, framing or scenery. No text, no letters, no numbers, no logos, no UI, no devices, no floating accessories, no badges, no people, no plants. Understated luxury, precision, beautiful materiality. High-resolution clean cutout suitable for white or very pale sage website background.

## Данные

Расчеты и хранилище не заменены. Ключ `sgua-journal-v1` сохранен. Тестовые занятия создавались только на внутреннем адресе проверки и не входят в публичную сборку.
