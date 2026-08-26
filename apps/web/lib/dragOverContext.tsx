"use client";

import { createContext, useContext } from "react";
import type { DropZone } from "@to-do/shared";

export interface DragOverState {
  todoId: string;
  zone: DropZone;
}

export const DragOverContext = createContext<DragOverState | null>(null);

export function useDragOverState(todoId: string): DropZone | null {
  const state = useContext(DragOverContext);
  return state?.todoId === todoId ? state.zone : null;
}
