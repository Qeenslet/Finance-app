'use strict'

const path = require('path');

const { app, ipcMain, dialog } = require('electron');

const Window = require('./Window');

const Model = require('./Model');
const Sets = require('./Settings');


const sync = require('./Synchronizator');

const MyData = new Model();
const mySettings = new Sets(MyData);

/**
 * Main app function
 */
function main () {
    let mainWindow = new Window({
        file: path.join('renderer', 'index.html')
    });
    // Main window display
    let addExpenseWin;
    let syncWindow;
    let setsWindow;
    const date = new Date();
    const firstDate = splitDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const lastDate = splitDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    mainWindow.once('show', () => {
        renderMain(mainWindow);
    });

    // add window display
    ipcMain.on('add-todo-window', () => {
        // if addTodoWin does not already exist
        if (!addExpenseWin) {
            // create a new add todo window
            addExpenseWin = new Window({
                file: path.join('renderer', 'add.html'),
                width: 350,
                height: 550,
                // close with the main window
                parent: mainWindow,
                frame: false
            });
            addExpenseWin.on('show', async () => {
                const incomes = await mySettings.getIncomes();
                const categs = await mySettings.getExpenses();
                addExpenseWin.webContents.send('open-add-window', incomes, categs);
            });

            // cleanup
            addExpenseWin.on('closed', () => {
                addExpenseWin = null;
            });
        }
    });
    // Add entry event
    ipcMain.on('add-entry', async (event, data) => {
        const categs = await mySettings.getExpenses();
        if (categs[data.expense_categ] && parseFloat(data.expense_sum) > 0) {
            let tmp = data.expense_sum;
            tmp *= -1;
            data.expense_sum = tmp + '';
        }
        let action = MyData.addExpense(data);
        action.then(entry => {
            let saveCommand = MyData.saveCommand('ADD', entry);
            saveCommand.then(() => renderMain(mainWindow))
        }).catch(error => {
            showError(error);
        });
    });
    // Delete entry event
    ipcMain.on('delete-entry', (event, entryID) => {
        const deleting = MyData.deleteEntry(entryID);
        const logging = MyData.registerDeletion(entryID);
        Promise.all([deleting, logging]).then(() => renderMain(mainWindow)).catch(error => showError(error));
        //deleting.then(() => renderMain(mainWindow)).catch(error => showError(error));
    });

    ipcMain.on('change-month', (event, monthSelected) => {
       if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthSelected)) {
           monthSelected += '-01 00:00:01';
           renderMain(mainWindow, monthSelected);
       }
    });

    ipcMain.on('select-categ', (event, categ, month) => {
        month += '-01 00:00:01';
        renderEntriesForCateg(mainWindow, categ, month);
    });

    ipcMain.on('sync-request', async event => {
        const settings = await mySettings.getApiSettings();
        if (!syncWindow) {
            syncWindow = getSyncWindow(mainWindow);
            syncWindow.on('show', () => {
                const syncer = new sync(MyData, settings, syncWindow);
                syncer.syncronize();
            });

            // cleanup
            syncWindow.on('closed', () => {
                syncWindow = null;
                renderMain(mainWindow);
            });
        }
    });
    ipcMain.on('terminate-sync', async event => {
        const settings = await mySettings.getApiSettings();
        if (!syncWindow) {
            syncWindow = getSyncWindow(mainWindow);
            syncWindow.on('show', () => {
                const syncer = new sync(MyData, settings, syncWindow);
                syncer.syncronize();
            });

            // cleanup
            syncWindow.on('closed', () => {
                mainWindow.close();
            });
        }
    });
    ipcMain.on('terminate', event => {
        mainWindow.close();
    });

    ipcMain.on('minimize', event => {
        mainWindow.minimize();

    });

    ipcMain.on('settings', event => {
        if (!setsWindow) {
            setsWindow = new Window({
                file: path.join('renderer', 'settings.html'),
                width: 500,
                height: 700,
                // close with the main window
                parent: mainWindow,
                frame: false
            });
            setsWindow.on('show', () => {
                setsWindow.webContents.send('display-setts');
            });
            setsWindow.on('closed', () => {
                setsWindow = null;
            });
        }
    });
}

/**
 * Rendering main window
 *
 * @param mainWindow
 * @param desiredDate
 */
async function renderMain(mainWindow, desiredDate = null) {
    const categs = await mySettings.getExpenses();
    const incomes = await mySettings.getIncomes();
    const date = desiredDate ? new Date(desiredDate) : new Date();
    const firstDate = splitDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const lastDate = splitDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    let balance = MyData.getBalanceInterval(firstDate, lastDate);
    let m = parseInt(date.getMonth()) + 1;
    if (m < 10) m = '0' + m;
    const theMonth = date.getFullYear() + '-' + m;
    balance.then(res => {
        let sum = 0;
        const byCateg = {};
        res.forEach(elem => {
            sum += parseFloat(elem.expense_sum);
            if (!byCateg[elem.expense_categ]) byCateg[elem.expense_categ] = 0;
            byCateg[elem.expense_categ] += parseFloat(elem.expense_sum);
        });
        mainWindow.webContents.send('all-list', res, categs, incomes);
        mainWindow.webContents.send('balance', sum, theMonth);
        const result = [];
        const result2 = [];
        for (const cat in byCateg) {
            if (categs[cat]) {
                result.push({name: categs[cat], amt: byCateg[cat], key: cat});
            } else if (incomes[cat]) {
                result2.push({name: incomes[cat], amt: byCateg[cat], key: cat})
            }
        }
        result.sort((a, b) => (a.amt > b.amt) ? 1 : -1);
        result2.sort((a, b) => (a.amt > b.amt) ? -1 : 1);
        mainWindow.webContents.send('empty-categ');
        result.forEach(el => {
            mainWindow.webContents.send('categ', (el.amt * -1), el.name, el.key, theMonth);
        });
        result2.forEach(el => {
            mainWindow.webContents.send('categ2', el.amt, el.name, el.key, theMonth);
        });
    });

}

/**
 *
 * @param mainWindow
 * @param category
 * @param desiredMonth
 */
async function renderEntriesForCateg(mainWindow, category, desiredMonth) {
    const categs = await mySettings.getExpenses();
    const incomes = await mySettings.getIncomes();
    const date = new Date(desiredMonth);
    const firstDate = splitDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const lastDate = splitDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    let result = MyData.getExpensesByCategory(category, firstDate, lastDate);
    result.then(res => {
        mainWindow.webContents.send('all-list', res, categs, incomes, true);
    });
}

/**
 * Convert date object to DB format YYYY-MM-DD
 * @param date
 * @returns {string}
 */
 function splitDate(date) {
    if (date instanceof Date){
        return date.toISOString().split('T')[0];
    }
    return '1999-01-01';
 }


 function getSyncWindow(mainWindow) {
     return new Window({
         file: path.join('renderer', 'synchronizator.html'),
         width: 350,
         height: 550,
         parent: mainWindow,
         frame: false
     });
 }


/**
 * Display error
 * @param errorMessage
 */
 function showError(errorMessage) {
     dialog.showErrorBox("Application error", errorMessage);
 }
app.on('ready', main);

app.on('window-all-closed', function (){
    MyData.closeConnection();
    app.quit();
});