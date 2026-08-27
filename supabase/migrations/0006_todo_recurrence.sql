-- 重複任務：只存一個 jsonb 規則欄位，null 代表不重複。
-- 完成一個有 recurrence_rule 的 todo 時，應用程式邏輯（見 packages/shared/src/domain/recurrence.ts
-- 的 resolveCompletion）會把 due_date 前進到下一次發生日、is_completed 重設回 false，
-- 不會另外新增一筆資料列——這個 app 目前沒有「已完成任務歷史」頁面，維護 template/instance
-- 兩種列的複雜度换不到什麼價值，之後真的需要重複任務的完成歷史再改。
alter table todo.todos
  add column recurrence_rule jsonb;
