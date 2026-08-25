"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import type { List } from "@to-do/shared";
import { useAddList, useDeleteList, useLists, useRenameList } from "@/lib/queries";

function ListRow({ list, isActive }: { list: List; isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}` });
  const renameList = useRenameList();
  const deleteList = useDeleteList();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
        isOver ? "bg-blue-100 ring-2 ring-blue-300" : isActive ? "bg-neutral-200" : "hover:bg-neutral-100"
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (name.trim() && name !== list.name) {
              renameList.mutate({ id: list.id, name: name.trim() });
            } else {
              setName(list.name);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(list.name);
              setEditing(false);
            }
          }}
          className="w-full rounded border border-neutral-300 px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <>
          <Link href={`/lists/${list.id}`} className="flex-1 truncate">
            {list.is_inbox ? "📥 " : ""}
            {list.name}
          </Link>
          <div className="hidden shrink-0 gap-1 group-hover:flex">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded px-1 text-xs text-neutral-500 hover:text-neutral-900"
              aria-label="重新命名"
            >
              ✎
            </button>
            {!list.is_inbox && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`刪除清單「${list.name}」？裡面的待辦事項也會一併刪除。`)) {
                    deleteList.mutate(list.id);
                  }
                }}
                className="rounded px-1 text-xs text-neutral-500 hover:text-red-600"
                aria-label="刪除"
              >
                ✕
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ListSidebar() {
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const pathname = usePathname();
  const [newListName, setNewListName] = useState("");

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-white p-3">
      <Link
        href="/"
        className={`rounded-md px-2 py-1.5 text-sm font-medium ${pathname === "/" ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
      >
        所有清單
      </Link>
      <Link
        href="/calendar"
        className={`rounded-md px-2 py-1.5 text-sm font-medium ${pathname === "/calendar" ? "bg-neutral-200" : "hover:bg-neutral-100"}`}
      >
        📅 行事曆
      </Link>

      <div className="mt-3 mb-1 text-xs font-medium uppercase text-neutral-400">清單</div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {lists.map((list) => (
          <ListRow key={list.id} list={list} isActive={pathname === `/lists/${list.id}`} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newListName.trim();
          if (!trimmed) return;
          addList.mutate(trimmed);
          setNewListName("");
        }}
        className="mt-2"
      >
        <input
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="+ 新增清單"
          className="w-full rounded-md border border-transparent px-2 py-1.5 text-sm outline-none hover:border-neutral-200 focus:border-neutral-400"
        />
      </form>
    </aside>
  );
}
