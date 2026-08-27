import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { CalendarDays, Inbox, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import type { List } from "@to-do/shared";
import { useAddList, useDeleteList, useLists, useRenameList } from "@/lib/queries";
import type { View } from "@/lib/view";

function viewsEqual(a: View, b: View): boolean {
  if (a.type !== b.type) return false;
  return a.type === "list" && b.type === "list" ? a.listId === b.listId : true;
}

function ListRow({
  list,
  isActive,
  onNavigate,
}: {
  list: List;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}` });
  const renameList = useRenameList();
  const deleteList = useDeleteList();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        isOver
          ? "bg-accent-50 ring-2 ring-accent-300"
          : isActive
            ? "bg-accent-50 text-accent-700"
            : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {list.is_inbox ? (
        <Inbox size={15} className="shrink-0 text-neutral-400" />
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: list.color ?? "#a3a3a3" }} />
      )}

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
          className="w-full rounded border border-accent-300 px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <>
          <button type="button" onClick={onNavigate} className="flex-1 truncate text-left">
            {list.name}
          </button>
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
              aria-label="重新命名"
            >
              <Pencil size={12} />
            </button>
            {!list.is_inbox && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`刪除清單「${list.name}」？裡面的待辦事項也會一併刪除。`)) {
                    deleteList.mutate(list.id);
                  }
                }}
                className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                aria-label="刪除"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const [newListName, setNewListName] = useState("");

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-white p-3 shadow-lg md:shadow-none">
      <div className="mb-2 flex items-center gap-2 px-2 py-1">
        <span className="flex-1 text-sm font-semibold text-neutral-800">TODO</span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate({ type: "all" })}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors ${
          viewsEqual(view, { type: "all" }) ? "bg-accent-50 text-accent-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <ListChecks size={15} />
        所有清單
      </button>
      <button
        type="button"
        onClick={() => onNavigate({ type: "calendar" })}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors ${
          viewsEqual(view, { type: "calendar" })
            ? "bg-accent-50 text-accent-700"
            : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <CalendarDays size={15} />
        行事曆
      </button>

      <div className="mt-3 mb-1 px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">清單</div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {lists.map((list) => (
          <ListRow
            key={list.id}
            list={list}
            isActive={viewsEqual(view, { type: "list", listId: list.id })}
            onNavigate={() => onNavigate({ type: "list", listId: list.id })}
          />
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
        className="mt-2 flex items-center gap-1 rounded-md border border-transparent px-2 py-1.5 hover:border-neutral-200 focus-within:border-accent-400"
      >
        <Plus size={14} className="shrink-0 text-neutral-400" />
        <input
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="新增清單"
          className="w-full text-sm outline-none placeholder:text-neutral-400"
        />
      </form>
    </aside>
  );
}
