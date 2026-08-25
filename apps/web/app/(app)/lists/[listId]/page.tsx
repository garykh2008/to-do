"use client";

import { use } from "react";
import { useLists } from "@/lib/queries";
import { TodoListView } from "@/components/TodoListView";

export default function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params);
  const { data: lists = [], isLoading } = useLists();

  if (isLoading) {
    return <p className="p-6 text-sm text-neutral-400">載入中…</p>;
  }

  const list = lists.find((l) => l.id === listId);

  if (!list) {
    return <p className="p-6 text-sm text-neutral-400">找不到這個清單</p>;
  }

  return <TodoListView listId={list.id} listName={list.name} />;
}
