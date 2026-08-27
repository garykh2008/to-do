-- 標籤：用單一 text[] 欄位存標籤名稱，不建 labels/todo_labels 關聯表。
-- 單一使用者用不到跨標籤改名/改色的管理需求，denormalized 陣列在本機儲存模式
-- （widget/local-web 的 JSON 檔）也比較好對應，不需要處理 join。顏色用字串 hash 決定，
-- 見 packages/shared/src/domain/labelColor.ts。

alter table todo.todos
  add column labels text[] not null default '{}';

create index todos_labels_gin_idx on todo.todos using gin (labels);
