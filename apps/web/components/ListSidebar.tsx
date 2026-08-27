"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { Bell, BellOff, CalendarDays, HelpCircle, Inbox, ListChecks, LogOut, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import type { List } from "@to-do/shared";
import { useAddList, useDeleteList, useLists, useRenameList } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { useDueDateReminders } from "@/lib/useDueDateReminders";
import { HelpModal } from "./HelpModal";

function ListRow({
  list,
  isActive,
  onNavigate,
}: {
  list: List;
  isActive: boolean;
  onNavigate?: () => void;
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
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: list.color ?? "#a3a3a3" }}
        />
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
          <Link href={`/lists/${list.id}`} onClick={onNavigate} className="flex-1 truncate">
            {list.name}
          </Link>
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

export function ListSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [newListName, setNewListName] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const { enabled: remindersEnabled, toggle: toggleReminders } = useDueDateReminders();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-white p-3 shadow-lg md:shadow-none">
      <div className="mb-2 flex items-center gap-2 px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- 固定小尺寸的 App icon，不需要 next/image 的最佳化 */}
        <img src="/icon.png" alt="" className="h-7 w-7 rounded-lg" />
        <span className="flex-1 text-sm font-semibold text-neutral-800">TODO</span>
        <button
          type="button"
          onClick={toggleReminders}
          className={`rounded p-1 hover:bg-neutral-100 ${remindersEnabled ? "text-accent-600" : "text-neutral-400 hover:text-neutral-700"}`}
          aria-label={remindersEnabled ? "關閉到期提醒" : "開啟到期提醒"}
          title={remindersEnabled ? "已開啟到期提醒（分頁開著時）" : "開啟到期提醒（分頁開著時）"}
        >
          {remindersEnabled ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="使用說明"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <Link
        href="/today"
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          pathname === "/today" ? "bg-accent-50 text-accent-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <Sun size={15} />
        今天
      </Link>
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          pathname === "/" ? "bg-accent-50 text-accent-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <ListChecks size={15} />
        所有清單
      </Link>
      <Link
        href="/calendar"
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          pathname === "/calendar" ? "bg-accent-50 text-accent-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <CalendarDays size={15} />
        行事曆
      </Link>

      <div className="mt-3 mb-1 px-2 text-xs font-medium uppercase tracking-wide text-neutral-400">清單</div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {lists.map((list) => (
          <ListRow
            key={list.id}
            list={list}
            isActive={pathname === `/lists/${list.id}`}
            onNavigate={onNavigate}
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

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          router.replace("/login");
          router.refresh();
        }}
        className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        <LogOut size={13} />
        登出
      </button>
    </aside>
  );
}
