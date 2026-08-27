import { useState, type FormEvent } from "react";
import { CalendarDays, Plus } from "lucide-react";

export function QuickAddBar({
  targetListName,
  onAdd,
}: {
  targetListName: string;
  onAdd: (title: string, dueDate: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDate, setShowDate] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, dueDate || null);
    setTitle("");
    setDueDate("");
    setShowDate(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-b border-neutral-200 bg-white p-2.5">
      <div className="flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`快速新增到 ${targetListName}…`}
          className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <button
          type="button"
          onClick={() => setShowDate((v) => !v)}
          className={`flex shrink-0 items-center justify-center rounded-md border px-2 transition-colors ${
            showDate
              ? "border-accent-600 bg-accent-600 text-white"
              : "border-neutral-300 text-neutral-400 hover:text-neutral-600"
          }`}
          aria-label="設定截止日期"
        >
          <CalendarDays size={14} />
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex shrink-0 items-center justify-center rounded-md bg-accent-600 px-2 text-white transition-colors hover:bg-accent-700 disabled:opacity-40"
          aria-label="新增"
        >
          <Plus size={14} />
        </button>
      </div>
      {showDate && (
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-accent-500"
        />
      )}
    </form>
  );
}
