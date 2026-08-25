"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useTodosInRange, useUpdateTodo } from "@/lib/queries";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function CalendarGrid() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const updateTodo = useUpdateTodo();

  const gridStart = startOfWeek(startOfMonth(currentMonth));
  const gridEnd = endOfWeek(endOfMonth(currentMonth));
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const rangeStart = format(gridStart, "yyyy-MM-dd");
  const rangeEnd = format(gridEnd, "yyyy-MM-dd");
  const { data: todos = [], isLoading } = useTodosInRange(rangeStart, rangeEnd);

  const todosByDay = useMemo(() => {
    const map = new Map<string, typeof todos>();
    for (const todo of todos) {
      if (!todo.due_date) continue;
      const key = todo.due_date;
      map.set(key, [...(map.get(key) ?? []), todo]);
    }
    return map;
  }, [todos]);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedTodos = selectedKey ? (todosByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{format(currentMonth, "yyyy年 M月")}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
          >
            ← 上個月
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
          >
            下個月 →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTodos = todosByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex h-20 flex-col items-start rounded-md border p-1.5 text-left text-xs ${
                selected
                  ? "border-neutral-900"
                  : isToday(day)
                    ? "border-blue-400"
                    : "border-neutral-200"
              } ${inMonth ? "bg-white" : "bg-neutral-50 text-neutral-400"}`}
            >
              <span className={isToday(day) ? "font-semibold text-blue-600" : ""}>{format(day, "d")}</span>
              {dayTodos.length > 0 && (
                <span className="mt-auto flex items-center gap-1 self-end rounded-full bg-neutral-800 px-1.5 text-[10px] text-white">
                  {dayTodos.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-neutral-400">載入中…</p>}

      {selectedDay && (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">{format(selectedDay, "yyyy/MM/dd")} 的待辦事項</h2>
          {selectedTodos.length === 0 ? (
            <p className="text-sm text-neutral-400">這天沒有待辦事項</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedTodos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={todo.is_completed}
                    onChange={(e) =>
                      updateTodo.mutate({
                        id: todo.id,
                        listId: todo.list_id,
                        is_completed: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span className={todo.is_completed ? "text-neutral-400 line-through" : ""}>{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
