import { app, BrowserWindow } from "electron";
import * as path from "path";

// Determine if we are in development mode
const isDevelopment = process.env.NODE_ENV !== "production";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  if (isDevelopment) {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  } else {
    // Production: point at the Next.js standalone output served by a small
    // HTTP server, or at the built static files directly.
    win.loadFile(path.join(__dirname, "index.html"), {
      query: { path: "index.html" },
    });
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow).catch((error) => {
  console.error("AstraVitals: could not start Electron.", error);
  app.quit();
});

// Minimal IPC bridge for the preload script.
import { ipcMain } from "electron";

ipcMain.handle("get-version", () => app.getVersion());
