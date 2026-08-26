-- 保底防線：不管應用程式邏輯有沒有漏洞，資料庫層直接禁止 parent_id 指向自己。
-- 這種資料一旦寫進去，畫面渲染邏輯會因為「父鏈找不到頂層」讓項目整個消失，
-- 已經在應用層修過兩次類似的 race condition，這裡直接在資料庫加一道不可能繞過的保險。

alter table todo.todos
  add constraint todos_no_self_parent check (parent_id is null or parent_id <> id);
