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

contextBridge.exposeInMainWorld("authStorage", authStorage);
contextBridge.exposeInMainWorld("windowControls", windowControls);
