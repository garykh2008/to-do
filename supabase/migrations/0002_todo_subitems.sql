-- 子項目（subtask）支援：todo 可以有一個 parent_id 指向另一個 todo。
-- 只允許一層巢狀（子項目不能再有自己的子項目），這個限制在應用程式層處理，不在資料庫層擋。

alter table todo.todos
  add column parent_id uuid references todo.todos(id) on delete cascade;

create index todos_parent_position_idx on todo.todos (list_id, parent_id, position);
