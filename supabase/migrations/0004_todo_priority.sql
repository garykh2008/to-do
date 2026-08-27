-- 優先權：1（最高）～4（無優先權，預設）。
-- 4 是「無優先權」而不是 0，跟畫面上「數字愈小愈緊急」的顯示邏輯直接對應，不用額外轉換。

alter table todo.todos
  add column priority smallint not null default 4 check (priority between 1 and 4);

create index todos_user_priority_idx on todo.todos (user_id, priority) where priority < 4;
