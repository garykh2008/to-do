import { useDroppable } from "@dnd-kit/core";
import type { List } from "@to-do/shared";

function Chip({ list }: { list: List }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}` });
  return (
    <div
      ref={setNodeRef}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
        isOver ? "border-blue-400 bg-blue-100" : "border-neutral-300 bg-white"
      }`}
    >
      {list.is_inbox ? "📥 " : ""}
      {list.name}
    </div>
  );
}

export function ListChips({ lists }: { lists: List[] }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-t border-neutral-200 bg-neutral-50 p-2">
      {lists.map((list) => (
        <Chip key={list.id} list={list} />
      ))}
    </div>
  );
}
