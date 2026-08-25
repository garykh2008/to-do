-- 個人 TODO 工具的資料庫 schema
-- 在自架 Supabase 的 Studio SQL editor 中執行

create schema if not exists todo;

grant usage on schema todo to authenticated, anon;
alter default privileges in schema todo grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema todo grant usage, select on sequences to authenticated;

create or replace function todo.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- LISTS ----------------------------------------------------------------
create table todo.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  color       text,
  is_inbox    boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 每位使用者只能有一個 inbox 清單
create unique index lists_one_inbox_per_user
  on todo.lists (user_id) where (is_inbox);

create index lists_user_position_idx on todo.lists (user_id, position);

create trigger lists_set_updated_at
  before update on todo.lists
  for each row execute function todo.set_updated_at();

alter table todo.lists enable row level security;

create policy "lists_select_own" on todo.lists
  for select using (user_id = auth.uid());
create policy "lists_insert_own" on todo.lists
  for insert with check (user_id = auth.uid());
create policy "lists_update_own" on todo.lists
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "lists_delete_own" on todo.lists
  for delete using (user_id = auth.uid() and not is_inbox);

-- TODOS ------------------------------------------------------------------
create table todo.todos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_id       uuid not null references todo.lists(id) on delete cascade,
  title         text not null check (char_length(trim(title)) > 0),
  notes         text,
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  due_date      date,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index todos_list_position_idx on todo.todos (list_id, position);
create index todos_user_due_date_idx on todo.todos (user_id, due_date) where due_date is not null;
create index todos_user_completed_idx on todo.todos (user_id, is_completed);

create trigger todos_set_updated_at
  before update on todo.todos
  for each row execute function todo.set_updated_at();

alter table todo.todos enable row level security;

create policy "todos_select_own" on todo.todos
  for select using (user_id = auth.uid());
create policy "todos_insert_own" on todo.todos
  for insert with check (user_id = auth.uid());
create policy "todos_update_own" on todo.todos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "todos_delete_own" on todo.todos
  for delete using (user_id = auth.uid());

-- REALTIME -----------------------------------------------------------------
alter publication supabase_realtime add table todo.lists;
alter publication supabase_realtime add table todo.todos;
