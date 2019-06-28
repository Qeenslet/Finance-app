'use strict'

const { ipcRenderer } = require('electron');
const categoryZone = 'spentsList';
const categoryZone2 = 'incomesList';
const allList = 'entry_list';
let outcome = 0;
let income = 0;


// create add todo window button
document.getElementById('createTodoBtn').addEventListener('click', () => {
    ipcRenderer.send('add-todo-window')
});
/**
 * Display balance
 */
ipcRenderer.on('balance', (event, balance, month) => {
    const bal = document.getElementById('monBal');
    bal.innerHTML = improvedFormat(balance);
    const selector = document.getElementById('monthSelector');
    selector.value = month;
});
/**
 * Display spents
 */
ipcRenderer.on('categ', (event, balance, categName) => {
    const bal = document.getElementById(categoryZone);
    outcome += parseFloat(balance);
    const total = document.getElementById('total_spents');
    total.innerText = roundAndFormat(outcome);
    bal.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${categName} <span class="badge badge-warning">${roundAndFormat(balance)}</span></li>`;
});
/**
 * Display incomes
 */
ipcRenderer.on('categ2', (event, balance, categName) => {
    const bal = document.getElementById(categoryZone2);
    income += parseFloat(balance);
    const total = document.getElementById('total_incomes');
    total.innerText = roundAndFormat(income);
    bal.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${categName} <span class="badge badge-success">${roundAndFormat(balance)}</span></li>`;
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
ipcRenderer.on('all-list', (event, list, spentList, incomesList) => {
    const tgt = document.getElementById(allList);
    let html = '';
    list.forEach(entry => {
        const dateO = new Date(entry.expense_date + ' 13:00:00');
        let categName;
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
    tgt.innerHTML = html;
});

/**
 * Delete entry
 * @param entryID
 */
function deleteEntry(entryID) {
    ipcRenderer.send('delete-entry', entryID);
}

/**
 * Format money
 * @param float
 * @returns {string}
 */
const roundAndFormat = float => {
    if (float < 0) float *= -1;
    return '$' + (Math.round(float * 100) / 100).toFixed(2);
};

const improvedFormat = float => {
    return float > 0 ? '<span style="color:green">' + roundAndFormat(float) + '</span>' :
        '<span style="color:red">' + roundAndFormat(float) + '</span>';
};

function changeMonth() {
    const selector = document.getElementById('monthSelector');
    ipcRenderer.send('change-month', selector.value);
}
