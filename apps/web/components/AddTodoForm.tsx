"use client";

import { useState, type FormEvent } from "react";
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新增待辦事項…"
        className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!title.trim()}
      >
        新增
      </button>
    </form>
  );
}
