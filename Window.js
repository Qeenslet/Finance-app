'use strict'

const { BrowserWindow } = require('electron')

const defaultProps = {
    width: 1550,
    height: 1200,
    show: false,
    webPreferences: {
        nodeIntegration: true
    },
    frame: false
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