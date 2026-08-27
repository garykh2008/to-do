import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Inbox, LayoutGrid, Plus } from "lucide-react";
import type { List } from "@to-do/shared";

function chipClass(isSelected: boolean, isOver: boolean) {
  if (isOver) return "border-accent-400 bg-accent-50 text-accent-700";
  if (isSelected) return "border-accent-600 bg-accent-600 text-white";
  return "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300";
}

function AllChip({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${chipClass(isSelected, false)}`}
    >
      <LayoutGrid size={11} />
      全部
    </button>
  );
}

function Chip({
  list,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  list: List;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}` });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuPos || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const clampedLeft = Math.min(menuPos.x, Math.max(4, window.innerWidth - rect.width - 4));
    const clampedTop = Math.min(menuPos.y, Math.max(4, window.innerHeight - rect.height - 4));
    menuRef.current.style.left = `${clampedLeft}px`;
    menuRef.current.style.top = `${clampedTop}px`;
  }, [menuPos]);

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => {
          setEditing(false);
          const trimmed = name.trim();
          if (trimmed && trimmed !== list.name) {
            onRename(trimmed);
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
        className="w-24 shrink-0 rounded-full border border-accent-400 px-2.5 py-1 text-xs outline-none"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        ref={setNodeRef}
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
        className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${chipClass(isSelected, isOver)}`}
      >
        {list.is_inbox ? (
          <Inbox size={11} />
        ) : (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: isSelected ? "#fff" : (list.color ?? "#a3a3a3") }}
          />
        )}
        {list.name}
      </button>

      {menuPos && (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuPos(null)} />
          <div
            ref={menuRef}
            className="fixed z-20 min-w-[100px] rounded-md border border-neutral-200 bg-white py-1 text-xs shadow-popover"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuPos(null);
                setEditing(true);
              }}
              className="block w-full px-2 py-1 text-left hover:bg-neutral-100"
            >
              重新命名
            </button>
            {!list.is_inbox && (
              <button
                type="button"
                onClick={() => {
                  setMenuPos(null);
                  if (confirm(`刪除清單「${list.name}」？裡面的待辦事項也會一併刪除。`)) {
                    onDelete();
                  }
                }}
                className="block w-full px-2 py-1 text-left text-red-600 hover:bg-red-50"
              >
                刪除
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

function AddListChip({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (adding) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed) {
            onAdd(trimmed);
          }
          setName("");
          setAdding(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setName("");
            setAdding(false);
          }
        }}
        placeholder="清單名稱…"
        className="w-24 shrink-0 rounded-full border border-accent-400 px-2.5 py-1 text-xs outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      aria-label="新增清單"
      className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-300 p-1 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
    >
      <Plus size={13} />
    </button>
  );
}

export function ListChips({
  lists,
  selectedListId,
  onSelectList,
  onAddList,
  onRenameList,
  onDeleteList,
}: {
  lists: List[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  onAddList: (name: string) => void;
  onRenameList: (listId: string, name: string) => void;
  onDeleteList: (listId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 標籤列一長就要橫向捲動；不顯示捲軸（見下面 className 裡隱藏捲軸的部分），
  // 改用左右箭頭按鈕來翻頁，沒有東西可以再捲的那一側就不顯示對應的箭頭。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateArrows() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }

    updateArrows();
    el.addEventListener("scroll", updateArrows);
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [lists.length]);

  function scrollByPage(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="relative border-t border-neutral-200 bg-neutral-50">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AllChip isSelected={selectedListId === null} onSelect={() => onSelectList(null)} />
        {lists.map((list) => (
          <Chip
            key={list.id}
            list={list}
            isSelected={selectedListId === list.id}
            onSelect={() => onSelectList(list.id)}
            onRename={(name) => onRenameList(list.id, name)}
            onDelete={() => onDeleteList(list.id)}
          />
        ))}
        <AddListChip onAdd={onAddList} />
      </div>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="向左捲動"
          className="absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-neutral-50 from-60% to-transparent pr-3 pl-1 text-neutral-500 hover:text-neutral-800"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="向右捲動"
          className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-neutral-50 from-60% to-transparent pr-1 pl-3 text-neutral-500 hover:text-neutral-800"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
