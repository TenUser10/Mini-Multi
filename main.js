const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true, // Ẩn thanh menu cho giống game thật
        title: "Mini-Multi Shooter Game"
    });

    // Trỏ trực tiếp đường dẫn file .exe đến trang web đang chạy online trên Render của 10
    win.loadURL('https://mini-multi.onrender.com');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});