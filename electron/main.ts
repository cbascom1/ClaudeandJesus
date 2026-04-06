import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { openDatabase, closeDatabase } from './db/database';
import { registerDbHandlers } from './ipc/dbHandlers';
import { registerImportHandlers } from './ipc/importHandlers';
import { registerTopicHandlers } from './ipc/topicHandlers';
import { IPC_CHANNELS } from '../src/types/ipc';

// Dev-only: remote debugging for automated DOM inspection.
if (process.env['ELECTRON_RENDERER_URL']) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
  app.commandLine.appendSwitch('remote-allow-origins', '*');
}

// Enforce single-instance — standard for desktop apps so double-launching focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#f6f1e6',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    // Open DevTools in dev mode for easier debugging
    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Surface any renderer load errors so we don't silently end up with a blank window
  mainWindow.webContents.on('did-fail-load', (_evt, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[main] Renderer failed to load (${errorCode}): ${errorDescription} — URL: ${validatedURL}`
    );
  });

  mainWindow.webContents.on('render-process-gone', (_evt, details) => {
    console.error('[main] Render process gone:', details);
  });

  // Dev vs production renderer loading
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // Initialize DB before opening the window — ensures tables exist when renderer queries
  openDatabase();

  // Register IPC handlers
  registerDbHandlers();
  registerImportHandlers();
  registerTopicHandlers();
  ipcMain.handle(IPC_CHANNELS.appGetVersion, () => app.getVersion());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});
