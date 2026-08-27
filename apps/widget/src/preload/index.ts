import { contextBridge, ipcRenderer } from "electron";

const authStorage = {
  getItem: (key: string): Promise<string | null> => ipcRenderer.invoke("secure-store:get", key),
  setItem: (key: string, value: string): Promise<void> => ipcRenderer.invoke("secure-store:set", key, value),
  removeItem: (key: string): Promise<void> => ipcRenderer.invoke("secure-store:remove", key),
};

const windowControls = {
  minimize: (): void => ipcRenderer.send("window:minimize"),
  close: (): void => ipcRenderer.send("window:close"),
};

type LocalStoreData = { lists: unknown[]; todos: unknown[] };

const localStore = {
  load: (): Promise<LocalStoreData | null> => ipcRenderer.invoke("local-store:load"),
  save: (data: LocalStoreData): Promise<void> => ipcRenderer.invoke("local-store:save", data),
  // 匯出/匯入本身是從系統匣選單觸發、在 main process 裡完成的（跳存檔/開檔對話框）；
  // 這裡只負責在匯入完成後，讓已經開著的視窗知道要拿新資料重新整理畫面。
  onImported: (callback: (data: LocalStoreData) => void): (() => void) => {
    const listener = (_event: unknown, data: LocalStoreData) => callback(data);
    ipcRenderer.on("local-store:imported", listener);
    return () => ipcRenderer.removeListener("local-store:imported", listener);
  },
};

contextBridge.exposeInMainWorld("authStorage", authStorage);
contextBridge.exposeInMainWorld("windowControls", windowControls);
contextBridge.exposeInMainWorld("localStore", localStore);
