# Планер 4.0: как обновить

## Что заменить на GitHub
Загрузите в корень репозитория, заменяя старые файлы:

- `index.html`, `sw.js`, `manifest.webmanifest`, `config.js`
- новые: `privacy.html`, `terms.html`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`

В `config.js` сохранены ваши URL и ключ Supabase. Впишите в нём `operator` (ваше ФИО или название) и `contact` (почта для обращений): они подставляются в юридические страницы.

Ваши данные не пропадут: при первом запуске старый формат автоматически переносится в новый (задачи, пометки, ДЗ, заметки, финансы, блоки, цели, категории дней, «Сборы»).
После обновления один раз откройте приложение с интернетом, чтобы новый service worker заменил старый кэш.

## Supabase: что проверить
Таблица и защита (если ещё не создавали):

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
```

Кнопка «Удалить аккаунт» вызывает функцию, которую нужно создать один раз:

```sql
create or replace function delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
```

Для регистрации и сброса пароля: Authentication → URL Configuration, в Site URL и Redirect URLs добавьте адрес вашего сайта на GitHub Pages.
Если подтверждение почты не нужно, отключите «Confirm email» в Authentication → Providers → Email.

## Юридическое
Тексты в `privacy.html` и `terms.html` написаны как шаблон для небольшого сервиса. Перед публикацией прочитайте их и при необходимости покажите юристу. Обратите внимание: Supabase хранит данные на серверах за пределами РФ, а для пользователей из РФ закон обычно требует хранить персональные данные граждан РФ в России. Если планер будет открыт для широкой аудитории, это нужно решить отдельно.
