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
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="mx-auto flex max-w-3xl min-w-0 flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-800 md:text-2xl">
          <CalendarDays size={22} className="text-accent-600" />
          {format(currentMonth, "yyyy年 M月")}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label="上個月"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label="下個月"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTodos = todosByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;

          const visibleTodos = dayTodos.slice(0, 3);
          const hiddenCount = dayTodos.length - visibleTodos.length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex h-14 flex-col items-start gap-1 overflow-hidden rounded-lg border p-1 text-left text-xs transition-colors md:h-28 md:p-1.5 ${
                selected
                  ? "border-accent-500 bg-accent-50"
                  : isToday(day)
                    ? "border-accent-300"
                    : "border-neutral-200 hover:border-neutral-300"
              } ${inMonth ? "bg-white" : "bg-neutral-50 text-neutral-300"}`}
            >
              <span
                className={
                  isToday(day)
                    ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 font-semibold text-white"
                    : "shrink-0"
                }
              >
                {format(day, "d")}
              </span>

              {/* 手機螢幕太窄放不下項目標題，只顯示數量圓標，完整內容看下方選中日期的清單 */}
              {dayTodos.length > 0 && (
                <span className="mt-auto flex items-center gap-1 self-end rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-white md:hidden">
                  {dayTodos.length}
                </span>
              )}

              <div className="hidden w-full min-w-0 flex-1 flex-col gap-0.5 overflow-hidden md:flex">
                {visibleTodos.map((todo) => (
                  <span
                    key={todo.id}
                    className={`w-full truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                      todo.is_completed ? "text-neutral-300 line-through" : "bg-accent-100 text-accent-700"
                    }`}
                  >
                    {todo.title}
                  </span>
                ))}
                {hiddenCount > 0 && <span className="px-1 text-[10px] text-neutral-400">還有 {hiddenCount} 項</span>}
              </div>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-neutral-400">載入中…</p>}

      {selectedDay && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-medium text-neutral-600">{format(selectedDay, "yyyy/MM/dd")} 的待辦事項</h2>
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
                    className="h-4 w-4 rounded"
                  />
                  <span className={todo.is_completed ? "text-neutral-400 line-through" : "text-neutral-700"}>
                    {todo.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
