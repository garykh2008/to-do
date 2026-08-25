import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 用 Electron 內建的 safeStorage（由作業系統金鑰庫加密）持久化 Supabase 的 session token。
 * renderer 端不會直接碰到這裡的邏輯，只能透過 preload 暴露的 IPC 呼叫。
 */

function storeFilePath(): string {
  return join(app.getPath("userData"), "secure-store.bin");
}

function readStore(): Record<string, string> {
  const file = storeFilePath();
  if (!existsSync(file) || !safeStorage.isEncryptionAvailable()) return {};
  try {
    const encrypted = readFileSync(file);
    return JSON.parse(safeStorage.decryptString(encrypted));
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, string>): void {
  if (!safeStorage.isEncryptionAvailable()) return;
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(storeFilePath(), safeStorage.encryptString(JSON.stringify(data)));
}

export function secureGetItem(key: string): string | null {
  return readStore()[key] ?? null;
}

export function secureSetItem(key: string, value: string): void {
  const store = readStore();
  store[key] = value;
  writeStore(store);
}

export function secureRemoveItem(key: string): void {
  const store = readStore();
  delete store[key];
  writeStore(store);
}
