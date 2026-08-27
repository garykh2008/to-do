/** 1 = 最高優先權，4 = 無優先權（預設）。數字愈小愈緊急，跟畫面排序、上色邏輯直接對應。 */
export const NO_PRIORITY = 4;

export const PRIORITY_COLORS: Record<1 | 2 | 3 | 4, { text: string; border: string; bg: string }> = {
  1: { text: "text-red-600", border: "border-red-300", bg: "bg-red-50" },
  2: { text: "text-orange-600", border: "border-orange-300", bg: "bg-orange-50" },
  3: { text: "text-blue-600", border: "border-blue-300", bg: "bg-blue-50" },
  4: { text: "text-neutral-300", border: "border-neutral-200", bg: "bg-transparent" },
};

/** 點擊優先權旗標時的循環順序：無 → P1 → P2 → P3 → 無。 */
export function cyclePriority(current: number): number {
  if (current === NO_PRIORITY) return 1;
  if (current >= 3) return NO_PRIORITY;
  return current + 1;
}

/** 資料庫理論上只會存 1–4，但這裡不假設輸入一定合法，異常值一律當「無優先權」處理。 */
export function priorityColor(priority: number): { text: string; border: string; bg: string } {
  return priority === 1 || priority === 2 || priority === 3 ? PRIORITY_COLORS[priority] : PRIORITY_COLORS[NO_PRIORITY];
}
