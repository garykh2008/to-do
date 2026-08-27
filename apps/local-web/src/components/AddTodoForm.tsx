import { useState, type FormEvent } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { parseQuickAdd } from "@to-do/shared";
import { useAddTodo } from "@/lib/queries";

export function AddTodoForm({ listId }: { listId: string }) {
  const addTodo = useAddTodo();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const today = new Date().toISOString().slice(0, 10);
    const parsed = parseQuickAdd(trimmed, today);
    addTodo.mutate({
      listId,
      title: parsed.title || trimmed,
      dueDate: parsed.dueDate ?? (dueDate || null),
      priority: parsed.priority ?? undefined,
      labels: parsed.labels.length > 0 ? parsed.labels : undefined,
    });
    setTitle("");
    setDueDate("");
    setShowDate(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-card focus-within:border-accent-400"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Plus size={16} className="shrink-0 text-neutral-300" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="新增待辦事項…（可以打「明天 p1 @標籤」）"
          className="min-w-0 flex-1 text-sm outline-none placeholder:text-neutral-400"
        />
        <button
          type="button"
          onClick={() => setShowDate((v) => !v)}
          className={`flex shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors ${
            showDate || dueDate
              ? "border-accent-600 bg-accent-600 text-white"
              : "border-neutral-200 text-neutral-400 hover:text-neutral-600"
          }`}
          aria-label="設定截止日期"
        >
          <CalendarDays size={15} />
        </button>
        <button
          type="submit"
          className="shrink-0 rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-40 sm:px-4"
          disabled={!title.trim()}
        >
          新增
        </button>
      </div>
      {showDate && (
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-fit rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 outline-none"
        />
      )}
    </form>
  );
}
