'use strict'

const path = require('path');

const { app, ipcMain, dialog } = require('electron');

const Window = require('./Window');

const Model = require('./Model');

const categs = require('./categs');

const incomes = require('./incomes');

const MyData = new Model();

/**
 * Main app function
 */
function main () {
    let mainWindow = new Window({
        file: path.join('renderer', 'index.html')
    });
    // Main window display
    let addExpenseWin;
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
            addExpenseWin.on('show', () => {
                addExpenseWin.webContents.send('open-add-window', incomes, categs);
            });

            // cleanup
            addExpenseWin.on('closed', () => {
                addExpenseWin = null
            });
        }
    });
    // Add entry event
    ipcMain.on('add-entry', (event, data) => {
        if (categs[data.expense_categ] && parseFloat(data.expense_sum) > 0) {
            let tmp = data.expense_sum;
            tmp *= -1;
            data.expense_sum = tmp + '';
        }
        let action = MyData.addExpense(data);
        action.then(() => renderMain(mainWindow))
              .catch(error => {
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

    ipcMain.on('sync-request', event => {
        syncronization(mainWindow);
    })
}

/**
 * Rendering main window
 *
 * @param mainWindow
 * @param desiredDate
 */
function renderMain(mainWindow, desiredDate = null) {
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

function renderEntriesForCateg(mainWindow, category, desiredMonth) {
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

 function syncronization(mainWindow) {
     mainWindow.webContents.send('update-sync', 'Requesting remote server');
     let req = Model.requestRemoteSummary();
     req.then(response => response.json())
         .then(serverData => {
             mainWindow.webContents.send('update-sync', 'Response recieved');
             let req2 = MyData.getAllSum();
             req2.then(row => {
                 let req3 = MyData.getAllNumber();
                 req3.then(row2 => {
                     compareSync(serverData, row, row2, mainWindow);
                 })
             })
         }).catch( error => {
         mainWindow.webContents.send('update-sync', 'Error: ' + error);
     })
 }


 function compareSync(r, sum, total, mainWindow) {
     if (r.summary.entries != total.total && r.summary.sum != sum.total) {
        if (r.summary.entries == 0 || r.summary.entries < total.total) {
            //Remote storage is empty or there are less entries
            passToServer(mainWindow);
        } else if (r.summary.entries > total.total) {
            //There are more entries in remote storage than in local
            applyFromServer(mainWindow);
        }
        syncronization(mainWindow);
    } else if (r.summary.sum != sum.total) {
         passToServer(mainWindow)

     } else {
         mainWindow.webContents.send('update-sync', 'Data is up to date!');
     }
 }

 function passToServer(mainWindow) {
     let req = MyData.getAllEntries();
     let del = MyData.getAllDeletions();
     Promise.all([req, del]).then(async values => {
         const send1 = await Model.sendEntriesToRemote(values[0]);
         const send2 = await Model.requestDeletionFromRemote(values[1]);
         Promise.all([send1, send2]).then(someData => {
             console.log(someData);
             if (someData[1]) {
                 updateLocalBase(someData[1]);
             }
             mainWindow.webContents.send('update-sync', 'Data saved on remote server!');

         }).catch(error => {
             mainWindow.webContents.send('update-sync', 'Error: ' + error);
         });
     });
 }

 function applyFromServer(mainWindow) {
     mainWindow.webContents.send('update-sync', 'Synchronizing local and remote storage');
     let del = MyData.getAllDeletions();
     del.then(value => {
         //be sure that deletions on client side count
         let send2 = Model.requestDeletionFromRemote(value);
         send2.then(serverData => {
             //mainWindow.webContents.send('update-sync', 'Data saved on remote server!');
             updateLocalBase(serverData);
             mainWindow.webContents.send('update-sync', 'Synchronization completed, updating');
         });
     });

 }


 function updateLocalBase(serverData) {
     if (serverData.entries && serverData.entries.real) {
         serverData.entries.real.forEach(entry => {
             if (entry.expense_id) {
                 let check = MyData.checkEntry(entry.expense_id);
                 check.then(row => {
                     if (!row || !row.expense_id) {
                         let save = MyData.addExpense(entry);
                         save.then(() => {
                             renderMain(mainWindow)
                         })
                     }
                 })
             }
         });
     }
     if (serverData.entries && serverData.entries.deleted) {
         serverData.entries.deleted.forEach( del => {
             let act = MyData.deleteEntry(del.expense_id);
             act.then(() => {
                 renderMain(mainWindow);
             });
         });
     }
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