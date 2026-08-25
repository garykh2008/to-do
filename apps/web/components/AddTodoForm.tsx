"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useAddTodo } from "@/lib/queries";

export function AddTodoForm({ listId }: { listId: string }) {
  const addTodo = useAddTodo();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTodo.mutate({ listId, title: trimmed, dueDate: dueDate || null });
    setTitle("");
    setDueDate("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-card focus-within:border-accent-400"
    >
      <Plus size={16} className="shrink-0 text-neutral-300" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新增待辦事項…"
        className="flex-1 text-sm outline-none placeholder:text-neutral-400"
      />
      <label className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500">
        <CalendarDays size={13} />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-transparent outline-none"
        />
      </label>
      <button
        type="submit"
        className="shrink-0 rounded-md bg-accent-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-40"
        disabled={!title.trim()}
      >
        新增
      </button>
    </form>
  );
}
