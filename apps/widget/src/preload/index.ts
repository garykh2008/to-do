import { contextBridge, ipcRenderer } from "electron";

const authStorage = {
  getItem: (key: string): Promise<string | null> => ipcRenderer.invoke("secure-store:get", key),
  setItem: (key: string, value: string): Promise<void> => ipcRenderer.invoke("secure-store:set", key, value),
  removeItem: (key: string): Promise<void> => ipcRenderer.invoke("secure-store:remove", key),
};

contextBridge.exposeInMainWorld("authStorage", authStorage);
