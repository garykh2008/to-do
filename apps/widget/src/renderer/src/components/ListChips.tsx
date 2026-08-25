import { useDroppable } from "@dnd-kit/core";
import { Inbox, LayoutGrid } from "lucide-react";
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
}: {
  list: List;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}` });
  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onSelect}
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
  );
}

export function ListChips({
  lists,
  selectedListId,
  onSelectList,
}: {
  lists: List[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-t border-neutral-200 bg-neutral-50 p-2">
      <AllChip isSelected={selectedListId === null} onSelect={() => onSelectList(null)} />
      {lists.map((list) => (
        <Chip
          key={list.id}
          list={list}
          isSelected={selectedListId === list.id}
          onSelect={() => onSelectList(list.id)}
        />
      ))}
    </div>
  );
}
