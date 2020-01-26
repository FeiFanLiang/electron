// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu} = require('electron')
const path = require('path');
const fs = require('fs');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
const menuList = Menu.buildFromTemplate([{
    label: '菜单',
    submenu: [{
        label: '注销',
        click: function() {
            if (mainWindow !== null) {
                const exsits = fs.existsSync(path.join(process.cwd(), 'u.json'))
                if (exsits) {
                    fs.unlinkSync(path.join(process.cwd(), 'u.json'))
                }

            }

            mainWindow.loadFile('./login.html')
        }
    },
     {
        label: '调试',
        click: function() {
            if (mainWindow) {
                mainWindow.webContents.openDevTools()
            }
        }
    }
]
}])
const ipc = require('electron').ipcMain
ipc.on('login', function(event, status) {
    if (status = true)
        mainWindow.loadFile('index.html')
        //因为是同步策略，所以用event.returnValue
    event.returnValue = status;
    console.log("end");
});

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        }
    })
    Menu.setApplicationMenu(menuList)
        // and load the index.html of the app.
    const exsits = fs.existsSync(path.join(process.cwd(), 'u.json'))
    if (exsits) {
        const userInfo = require(path.join(process.cwd(), 'u.json')).username
        if (userInfo) {
            mainWindow.loadFile(path.join(__dirname, 'index.html'))
        } else {
            mainWindow.loadFile(path.join(__dirname, 'login.html'))
        }
    } else {
        mainWindow.loadFile(path.join(__dirname, 'login.html'))
    }

    //mainWindow.loadFile('index.html')
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.