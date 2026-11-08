-- Squirrel: уведомления. Выполнить один раз в Supabase: SQL Editor → New query → Run.

create table if not exists push_subs (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text primary key,
  sub jsonb not null,
  created_at timestamptz default now()
);
alter table push_subs enable row level security;
create policy "own subs select" on push_subs for select using (auth.uid() = user_id);
create policy "own subs insert" on push_subs for insert with check (auth.uid() = user_id);
create policy "own subs update" on push_subs for update using (auth.uid() = user_id);
create policy "own subs delete" on push_subs for delete using (auth.uid() = user_id);

create table if not exists reminders (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  fire_at timestamptz not null,
  title text not null,
  body text,
  sent boolean not null default false,
  primary key (user_id, id)
);
alter table reminders enable row level security;
create policy "own rem select" on reminders for select using (auth.uid() = user_id);
create policy "own rem insert" on reminders for insert with check (auth.uid() = user_id);
create policy "own rem update" on reminders for update using (auth.uid() = user_id);
create policy "own rem delete" on reminders for delete using (auth.uid() = user_id);

-- если время напоминания изменили, оно должно сработать снова
create or replace function reset_sent() returns trigger language plpgsql as $$
begin
  if new.fire_at is distinct from old.fire_at then new.sent := false; end if;
  return new;
end $$;
drop trigger if exists reminders_reset_sent on reminders;
create trigger reminders_reset_sent before update on reminders
  for each row execute function reset_sent();
