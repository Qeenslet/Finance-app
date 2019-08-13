'use strict'

const { BrowserWindow } = require('electron');
const path = require('path');

const defaultProps = {
    width: 1550,
    height: 1200,
    show: false,
    webPreferences: {
        nodeIntegration: true
    },
    frame: false,
    icon: path.join(__dirname, 'assets/icon.png')
}

class Window extends BrowserWindow {
    constructor ({file, ...windowSettings}) {
        super({...defaultProps, ...windowSettings})

        this.loadFile(file)
        //this.webContents.openDevTools();

        this.once('ready-to-show', () => {
            this.show()
        })
    }
}

module.exports = Window