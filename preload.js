const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('qt-minimize'),
  maximize: () => ipcRenderer.invoke('qt-maximize'),
  close: () => ipcRenderer.invoke('qt-close'),
  openExternal: (url) => ipcRenderer.invoke('qt-open-external', url)
});

