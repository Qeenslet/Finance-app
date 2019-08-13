'use strict'

const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const categoryZone = 'spentsList';
const categoryZone2 = 'incomesList';
const allList = 'entry_list';
let outcome = 0;
let income = 0;
let histIncome = 0;
let histOut = 0;


// create add todo window button
document.getElementById('createTodoBtn').addEventListener('click', () => {
    ipcRenderer.send('add-todo-window')
});
/**
 * Display balance
 */
ipcRenderer.on('balance', (event, balance, month, previous) => {
    const bal = document.getElementById('monBal');
    bal.innerHTML = improvedFormat(balance);
    const selector = document.getElementById('monthSelector');
    selector.value = month;
    histIncome = previous.in;
    histOut = previous.out;
});
/**
 * Display spents
 */
ipcRenderer.on('categ', (event, balance, categName, categCode, theMonth, historic) => {
    const bal = document.getElementById(categoryZone);
    balance = parseFloat(balance);
    let percent = transformStatistics((balance / (historic / 100)) - 100, 'out');
    outcome += balance;
    const total = document.getElementById('total_spents');
    total.innerHTML = roundAndFormat(outcome) + '&nbsp;' + transformStatistics((outcome / (histOut / 100)) - 100, 'out', false);
    bal.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center my-categs" style="cursor:pointer;" onclick="selectCateg('${categCode}', '${theMonth}')" id="list_categ_${categCode}">
${categName} ${percent} <span class="badge badge-warning">${roundAndFormat(balance)}</span>
</li>`;
});
/**
 * Display incomes
 */
ipcRenderer.on('categ2', (event, balance, categName, categCode, theMonth, historic) => {
    const bal = document.getElementById(categoryZone2);
    balance = parseFloat(balance);
    let percent = transformStatistics((balance / (historic / 100)) - 100, 'in');
    income += balance;
    const total = document.getElementById('total_incomes');
    total.innerHTML = roundAndFormat(income) + '&nbsp;' + transformStatistics((income / (histIncome / 100)) - 100, 'in', false);
    //total.innerText = roundAndFormat(income);
    bal.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center my-categs" style="cursor:pointer;" onclick="selectCateg('${categCode}', '${theMonth}')" id="list_categ_${categCode}">
${categName} ${percent} <span class="badge badge-success">${roundAndFormat(balance)}</span>
</li>`;
});
/**
 * Drop content after changes before rendering
 */
ipcRenderer.on('empty-categ', (event) => {
    income = outcome = 0;
    const bal = document.getElementById(categoryZone);
    bal.innerHTML = '';
    const bal2 = document.getElementById(categoryZone2);
    bal2.innerHTML = '';
    //const bal3 = document.getElementById(allList);
    //bal3.innerHTML = '';
    const total1 = document.getElementById('total_incomes');
    total1.innerText = '';
    const total2 = document.getElementById('total_spents');
    total2.innerText = '';
});
/**
 * Display entries
 */
ipcRenderer.on('all-list', (event, list, spentList, incomesList, categSelected = false) => {
    const tgt = document.getElementById(allList);
    let html = '';
    const uniqueCategs = new Set();
    list.forEach(entry => {
        const dateO = new Date(entry.expense_date + ' 13:00:00');
        let categName;
        uniqueCategs.add(entry.expense_categ);
        if (entry.expense_sum < 0){
            categName = spentList[entry.expense_categ] ? spentList[entry.expense_categ] : 'Undefined';
        } else {
            categName = incomesList[entry.expense_categ] ? incomesList[entry.expense_categ] : 'Undefined';
        }
        html += `<tr>
                     <td>${dateO.toDateString()}</td>
                     <td>${categName}</td>
                     <td>${entry.expense_descr ? entry.expense_descr : '--'}</td>
                     <td><span style="color:${entry.expense_sum > 0 ? 'green' : 'red'}">${roundAndFormat(parseFloat(entry.expense_sum))}</span></td>
                     <td><input type="button" class="btn btn-danger" value="X" onclick="deleteEntry('${entry.expense_id}')"></td>
               </tr>`;
    });
    const entriesSpec = document.getElementById('entries-categ-spec');
    const backButton = document.getElementById('backToAll');
    if (uniqueCategs.size === 1 && categSelected) {
        const iterator = uniqueCategs.values();
        let key = iterator.next();
        let name = spentList[key.value] ? spentList[key.value] : incomesList[key.value] ? incomesList[key.value] : '';
        if (name.length > 0) name = ' > ' + name;
        entriesSpec.innerText = name;
        backButton.style.display = 'block';
        const allLists = document.getElementsByClassName('my-categs');
        for (let i = 0; i < allLists.length; i++){
            allLists[i].classList.remove('active');
        }
        const highlight = document.getElementById('list_categ_' + key.value);
        highlight.classList.add('active');
    } else {
        entriesSpec.innerText = '';
        backButton.style.display = 'none';
    }
    tgt.innerHTML = html;
});

ipcRenderer.on('update-sync', (event, string) => {
    const tgt = document.getElementById('sync_status');
    tgt.innerHTML = string;
});

/**
 * Delete entry
 * @param entryID
 */
function deleteEntry(entryID) {
    //const {dialog} = require('electron').remote;
    const options = {type: 'question', buttons: ['Ok', 'Cancel'], message: 'Delete this entry?'};
    dialog.showMessageBox(options, i => {
        if (!i) {
            ipcRenderer.send('delete-entry', entryID);
        }
    })

}

/**
 * Format money
 * @param float
 * @returns {string}
 */
const roundAndFormat = float => {
    if (float < 0) float *= -1;
    return '$' + justRound(float);
};

const improvedFormat = float => {
    return float > 0 ? '<span style="color:green">' + roundAndFormat(float) + '</span>' :
        '<span style="color:red">' + roundAndFormat(float) + '</span>';
};

function changeMonth() {
    const selector = document.getElementById('monthSelector');
    ipcRenderer.send('change-month', selector.value);
}

function selectCateg(categ, month) {
    ipcRenderer.send('select-categ', categ, month);
}

function syncronize() {
    ipcRenderer.send('sync-request');
}

function closeProgramm() {
    const options = {type: 'question', buttons: ['Sync', 'Exit'], message: 'Do you want to sync data before exit?'};
    dialog.showMessageBox(options, i => {
        if (!i) {
            ipcRenderer.send('terminate-sync');
        } else {
            ipcRenderer.send('terminate');
        }
    })
}

function minProgramm() {
    ipcRenderer.send('minimize');
}


function launchSettings() {
    ipcRenderer.send('settings');
}

function justRound(number) {
    return (Math.round(number * 100) / 100).toFixed(2)
}


function transformStatistics(value, context, small = true) {
    if (!value) return '';
    if (isFinite(value)) {
        value = Math.round(value);
        let combine = 'primary';
        let color;
        let symbol;
        if ((value > 0 && context === 'out') || (value < 0 && context === 'in')) {
            combine = 'danger';
            color = 'red';
        } else if ((value < 0 && context === 'out') || (value > 0 && context === 'in')) {
            combine = 'success';
            color = 'green';
        }
        if (!small) {
            if (value > 0) value = '+' + value;
            return `<span title="Percent" class="badge badge-pill badge-${combine}">${value} %</span>`;
        } else {
            symbol = value > 0 ? '&#9652;' : '&#9662;';
            if (value > 0) value = '+' + value;
            return `<span style="color: ${color}" title="${value}%">${symbol}</span>`
        }

    }
    return '';
}

function showAbout() {
    ipcRenderer.send('about');
}
