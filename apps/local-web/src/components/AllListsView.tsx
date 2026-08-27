import { Inbox } from "lucide-react";
import { useAllTodos, useLists } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoTree } from "./TodoTree";

export function AllListsView() {
  const { data: lists } = useLists();
  const { data: todos, isLoading } = useAllTodos();

  const inbox = lists.find((l) => l.is_inbox) ?? lists[0];

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-neutral-800">所有清單</h1>

      {inbox && <AddTodoForm listId={inbox.id} />}

      {isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-neutral-400">還沒有任何清單，先在左側新增一個吧。</p>
      ) : (
        <div className="flex flex-col gap-6">
          {lists.map((list) => {
            const listTodos = todos.filter((t) => t.list_id === list.id);
            if (listTodos.length === 0) return null;

            return (
              <section key={list.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  {list.is_inbox ? (
                    <Inbox size={13} className="shrink-0 text-neutral-400" />
                  ) : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: list.color ?? "#a3a3a3" }}
                    />
                  )}
                  <h2 className="text-sm font-semibold text-neutral-600">{list.name}</h2>
                </div>
                <TodoTree todos={listTodos} emptyMessage="這個清單沒有待辦事項" />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
