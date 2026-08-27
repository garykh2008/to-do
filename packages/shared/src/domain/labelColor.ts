/**
 * 標籤顏色用字串 hash 決定，不另外存顏色欄位——同一個標籤名稱在哪個 app 顯示顏色都一樣，
 * 不需要一份「已知標籤」資料表去記錄配色（見 0005_todo_labels.sql 的註解）。
 */
const LABEL_PALETTE: readonly { text: string; bg: string }[] = [
  { text: "text-rose-700", bg: "bg-rose-100" },
  { text: "text-orange-700", bg: "bg-orange-100" },
  { text: "text-amber-700", bg: "bg-amber-100" },
  { text: "text-lime-700", bg: "bg-lime-100" },
  { text: "text-emerald-700", bg: "bg-emerald-100" },
  { text: "text-teal-700", bg: "bg-teal-100" },
  { text: "text-sky-700", bg: "bg-sky-100" },
  { text: "text-violet-700", bg: "bg-violet-100" },
  { text: "text-fuchsia-700", bg: "bg-fuchsia-100" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function hashLabelToColor(name: string): { text: string; bg: string } {
  const palette = LABEL_PALETTE[hashString(name) % LABEL_PALETTE.length];
  return palette ?? LABEL_PALETTE[0]!;
}

/** Quick add / 標籤輸入框共用：逗號分隔字串 → 去空白、去空字串、去重複的標籤陣列 */
export function parseLabelsInput(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const trimmed = raw.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}
