"use client";

import { useLists } from "@/lib/queries";
import { TodoListView } from "@/components/TodoListView";

export default function HomePage() {
  const { data: lists = [], isLoading, error } = useLists();

  if (error) {
    return <p className="p-6 text-sm text-red-600">讀取清單失敗：{error.message}</p>;
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-neutral-400">載入中…</p>;
  }

  const inbox = lists.find((l) => l.is_inbox) ?? lists[0];

  if (!inbox) {
    return <p className="p-6 text-sm text-neutral-400">還沒有任何清單，先在左側新增一個吧。</p>;
  }

  return <TodoListView listId={inbox.id} listName={inbox.name} />;
}
