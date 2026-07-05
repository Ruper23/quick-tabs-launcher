const fs = require('fs');
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const appRoot = path.join(__dirname, 'src');
  const iconPath = path.join(__dirname, 'assets', 'ql-logo.ico');

  const win = new BrowserWindow({
    width: 1200,
    height: 650,
    minWidth: 500,
    minHeight: 420,
    resizable: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#050a15',
    icon: iconPath,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const logPath = path.join(app.getPath('userData'), 'ql-renderer.log');
  const logger = fs.createWriteStream(logPath, { flags: 'a' });
  const store = (msg) => logger.write(new Date().toISOString() + ' ' + msg + '\n');

  win.webContents.on('did-start-loading', () => store('[renderer] did-start-loading'));
  win.webContents.on('did-finish-load', () => store('[renderer] did-finish-load'));
  win.webContents.on('did-fail-load', (ev, code, desc) => store('[renderer] did-fail-load: ' + code + ' ' + desc));
  win.webContents.on('render-process-gone', (ev, data) => store('[renderer] gone: ' + JSON.stringify(data)));
  win.webContents.on('unresponsive', () => store('[renderer] unresponsive'));
  win.webContents.on('responsive', () => store('[renderer] responsive'));

  ipcMain.handle('qt-open-external', async (_, url) => {
    try { await shell.openExternal(url); } catch (err) {
      console.error('[QL] openExternal failed', url, err);
      dialog.showErrorBox('Не удалось открыть ссылку', url);
    }
    return { ok: true };
  });

  win.webContents.on('console-message', (event, level, message) => {
    store('[renderer console] ' + message);
  });

  win.loadFile(path.join(appRoot, 'index.html')).catch(err => {
    store('[QL] loadFile error: ' + (err?.message || err));
  });
}

app.whenReady().then(() => {
  try { createWindow(); } catch (e) { console.error('[QL] createWindow failed', e); }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

process.on('uncaughtException', e => console.error('[QL] uncaughtException', e));
app.on('render-process-gone', (_e, _w, details) => console.error('[QL] render-process-gone', details));
app.on('child-process-gone', (_e, details) => console.error('[QL] child-process-gone', details));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('qt-minimize', async () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.handle('qt-maximize', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
});
ipcMain.handle('qt-close', async () => BrowserWindow.getFocusedWindow()?.close());
