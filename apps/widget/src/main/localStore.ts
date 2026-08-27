import { app, dialog } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 小工具「本機模式」的資料持久化：整份 {lists, todos} 就是一個 JSON 檔，
 * 存在使用者資料夾裡。換電腦只要把這個檔案複製過去（或用匯出/匯入）就好，
 * 不需要跑資料庫遷移、不需要帳號。
 */

export interface LocalStoreData {
  lists: unknown[];
  todos: unknown[];
}

function dataFilePath(): string {
  return join(app.getPath("userData"), "todo-data.json");
}

function isValidData(value: unknown): value is LocalStoreData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.lists) && Array.isArray(candidate.todos);
}

export function loadLocalStore(): LocalStoreData | null {
  const file = dataFilePath();
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8"));
    return isValidData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalStore(data: LocalStoreData): void {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = dataFilePath();
  // 先寫暫存檔再 rename，避免寫到一半當機或被砍掉導致正式檔案損毀成半截 JSON。
  const tmpFile = `${file}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  renameSync(tmpFile, file);
}

/** 跳存檔對話框，把目前的資料檔複製到使用者選的位置。回傳選定的路徑，取消則回傳 null。 */
export async function exportLocalStore(): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "匯出待辦事項資料",
    defaultPath: "todo-data.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return null;
  const data = loadLocalStore() ?? { lists: [], todos: [] };
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

/**
 * 跳開檔對話框讓使用者選一個先前匯出的 JSON 檔，驗證格式後整份覆蓋掉現有的本機資料。
 * 回傳匯入後的資料（給 renderer 更新畫面），取消或格式不對回傳 null。
 */
export async function importLocalStore(): Promise<LocalStoreData | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "匯入待辦事項資料",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"],
  });
  const selectedPath = filePaths[0];
  if (canceled || !selectedPath) return null;

  const raw = readFileSync(selectedPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!isValidData(parsed)) {
    throw new Error("檔案格式不對，不像是這個小工具匯出的資料");
  }
  saveLocalStore(parsed);
  return parsed;
}
