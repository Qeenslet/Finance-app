'use strict'
const { ipcRenderer, remote } = require('electron')
const Sets = require('../Settings');
const Model = require('../Model');

const myData = new Model();
const mySettings = new Sets(myData);

ipcRenderer.on('display-setts', event => {
    displaySettings('incomes');
});

async function displaySettings(key) {
    let array;
    const tabs = document.getElementsByClassName('nav-link');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    switch (key) {
        case 'incomes':
            array = await mySettings.getIncomes(true);
            break;
        case 'expense':
            array = await mySettings.getExpenses(true);
            break;
        default:
            array = await mySettings.getApiSettings(true);
    }
    const tgt = document.getElementById('settingZone');
    const tab = document.getElementById(key + '_tab');
    tab.classList.add('active');
    let html = '';
    array.forEach(elem => {
       html += formString(elem, key);
    });
    tgt.innerHTML = html;
    const addKey = document.getElementById('addNew');
    if (key === 'api') {
        addKey.style.display = 'none';
    } else {
        addKey.style.display = 'block';
    }
}


function formString(setting, key) {
    let html = '';
    if (key !== 'api') {
        let disabled = setting.used ? 'disabled' : '';
        html += `<div class="input-group mb-3">
                 <div class="input-group-prepend">
                     <input type="text" value="${setting.setting_value}" id="${setting.setting_key}" class="form-control" aria-describedby="button-addon-${setting}">
                     <input type="button" class="btn btn-outline-danger" id="button-addon-${setting}" value="X" ${disabled}>
                 </div>
             </div>`;
    } else {
        const setNames = {'server' : 'Server URL', 'apikey' : 'API key'};
        if (!setNames[setting.setting_key]) return '';
        html += `<div class="form-group">
                     <label for="${setting.setting_key}">${setNames[setting.setting_key]}</label>
                     <input type="text" value="${setting.setting_value}" id="${setting.setting_key}" class="form-control" aria-describedby="button-addon-${setting}">
                 </div>`;
    }

    return html;
}


function changeTab(tab) {
    displaySettings(tab);
}

function closeThisWindow() {
    myData.closeConnection();
    const w = remote.getCurrentWindow();
    w.close();
}
