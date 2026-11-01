# Squirrel 5.0: как обновить

## Что залить на GitHub (в корень репозитория, с заменой)
- `index.html`, `sw.js`, `manifest.webmanifest`, `config.js`, `privacy.html`, `terms.html`
- иконки: `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`

`config.js` уже содержит ваши URL и ключ Supabase. Впишите в нём `operator` и `contact` для юридических страниц.
Старые файлы `Иконка_приложения*.png` и `.svg` в репозитории не нужны.

Данные не пропадут: старый формат переносится автоматически. Отметки дней, смены и цели, которые раньше были общими,
после обновления окажутся на основном экране; на остальных экранах календарь будет пустым и независимым.
После обновления один раз откройте приложение с интернетом, чтобы новый service worker заменил кэш.
Если после обновления видна старая иконка: убедитесь, что на GitHub заменены ВСЕ файлы иконок (`icon.svg`, `icon-*.png`, `apple-touch-icon.png`), закройте вкладку, обновите страницу с очисткой кэша. На телефоне иконку на домашнем экране удалите и добавьте заново.

## Что нового
- Календарь у каждого экрана свой (категории дней, смены, цели).
- Календарь можно добавить блоком на экран «Календарь» (кнопка «+»): сворачивается, редактируется, дублируется, удаляется.
- У каждого блока: изменить имя, цветную метку (и убрать её), дублировать, удалить, свернуть (значок рядом с «⋯»).
- Фото в заметках: добавить, кадрировать, повернуть, дублировать, удалить, изменить размер.
- Цветные метки у пунктов списков, прогресса, предметов ДЗ, приёмов пищи, записей финансов, заметок.
- Перетаскивание задач: менять порядок или перенести на другой день (на день в неделе или в календаре).
- Ввод времени на компьютере: пишите цифры, например `930` превратится в `09:30`.

## Supabase
SQL для таблицы и функции удаления аккаунта не менялся, см. прежнюю инструкцию:

```sql
create table if not exists planner_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table planner_state enable row level security;
create policy "own row select" on planner_state for select using (auth.uid() = user_id);
create policy "own row insert" on planner_state for insert with check (auth.uid() = user_id);
create policy "own row update" on planner_state for update using (auth.uid() = user_id);
create policy "own row delete" on planner_state for delete using (auth.uid() = user_id);

create or replace function delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
```

Authentication → URL Configuration: добавьте адрес сайта на GitHub Pages в Site URL и Redirect URLs.

## Фото и объём данных
Фото сжимаются до 1200 px и хранятся внутри данных приложения (локально и в облаке). Это удобно для презентации,
но при десятках фото лимит браузера (около 5 МБ) может закончиться. Для продакшена фото лучше вынести в Supabase Storage.

## Юридическое
Тексты в `privacy.html` и `terms.html` написаны как шаблон. Перед публикацией покажите их юристу.
Supabase хранит данные за пределами РФ, а для пользователей из РФ закон обычно требует хранить персональные данные в России.
