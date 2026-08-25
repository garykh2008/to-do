import { useState, type FormEvent } from "react";

export function QuickAddBar({ onAdd }: { onAdd: (title: string, dueDate: string | null) => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-b border-neutral-200 p-2">
      <div className="flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="快速新增到 Inbox…"
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="button"
          onClick={() => setShowDate((v) => !v)}
          className={`shrink-0 rounded-md border px-2 text-xs ${
            showDate ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-500"
          }`}
          aria-label="設定截止日期"
        >
          📅
        </button>
      </div>
      {showDate && (
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none"
        />
      )}
    </form>
  );
}
