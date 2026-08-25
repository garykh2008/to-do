export type DropZone = "nest" | "before" | "after";

interface SimpleRect {
  top: number;
  height: number;
}

/**
 * 拖曳到另一個項目上時，用滑鼠（拖曳中項目）目前的垂直位置落在目標項目的哪個區段，
 * 判斷這次放開是要「巢狀化成子項目」還是「排序到前面/後面」。
 * 正中間 25%~75% 的區段 = 巢狀化（僅當 canNest 為 true 時才生效，否則一律當排序處理）。
 * 這個函式同時被 onDragOver（即時視覺提示）跟 onDragEnd（實際落點）呼叫，兩邊邏輯保證一致。
 */
export function resolveDropZone(
  activeRect: SimpleRect | null | undefined,
  overRect: SimpleRect | null | undefined,
  canNest: boolean,
): DropZone {
  if (!activeRect || !overRect || overRect.height <= 0) return "before";

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const relativeY = (activeCenterY - overRect.top) / overRect.height;

  if (canNest && relativeY > 0.25 && relativeY < 0.75) return "nest";
  return relativeY < 0.5 ? "before" : "after";
}
