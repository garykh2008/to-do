-- 建立唯一使用者的 Inbox 清單
-- 只需執行一次；把 <the-one-user-uuid> 換成 auth.users 裡你要用的帳號 UUID
-- (可用 `select id, email from auth.users;` 查詢)

insert into todo.lists (user_id, name, is_inbox, position)
values ('<the-one-user-uuid>', 'Inbox', true, 0);
