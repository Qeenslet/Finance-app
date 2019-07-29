'use strict'
const { ipcRenderer, remote } = require('electron');
const { dialog } = require('electron').remote;
const Sets = require('../Settings');
const Model = require('../Model');

const myData = new Model();
const mySettings = new Sets(myData);
const default_tab = 'incomes';
let current_tab;
let localChanges;

ipcRenderer.on('display-setts', event => {
    localChanges = {};
    displaySettings(default_tab);
});

async function displaySettings(key) {
    current_tab = key;
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
    if (localChanges[key] && localChanges[key][setting.setting_key]) {
        setting.setting_value = localChanges[key][setting.setting_key];
    }
    if (localChanges.deleted && localChanges.deleted[key] && localChanges.deleted[key][setting.setting_key]) {
        return '';
    }
    let html = '';
    if (key !== 'api') {
        let disabled = setting.used ? 'disabled' : '';
        html += `<div class="input-group mb-3">
                 <div class="input-group-prepend">
                     <input type="text" value="${setting.setting_value}" id="${setting.setting_key}" class="form-control" aria-describedby="button-addon-${setting.setting_key}" onkeyup="controlChanges(this)">
                     <input type="button" class="btn btn-outline-danger" id="button-addon-${setting.setting_key}" onclick="deleteSetting('${setting.setting_key}')" value="X" ${disabled}>
                 </div>
             </div>`;
    } else {
        const setNames = {'server' : 'Server URL', 'apikey' : 'API key'};
        if (!setNames[setting.setting_key]) return '';
        html += `<div class="form-group">
                     <label for="${setting.setting_key}">${setNames[setting.setting_key]}</label>
                     <input type="text" value="${setting.setting_value}" id="${setting.setting_key}" class="form-control" onkeyup="controlChanges(this)">
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

function randomParamKey() {
    return Math.random().toString(36).substr(2, 10);
}

function addNewParam() {
    const setting = {};
    setting.setting_value = '';
    setting.setting_key = randomParamKey();
    setting.used = false;
    let html = formString(setting, current_tab);
    const tgt = document.getElementById('settingZone');
    tgt.innerHTML += html;
}

function controlChanges(obj) {
    if (!localChanges[current_tab]) localChanges[current_tab] = {};
    localChanges[current_tab][obj.id] = obj.value;
}


async function saveAll() {
    if (Object.keys(localChanges).length) {
        try {
            await mySettings.saveSettings(localChanges);
            dialog.showMessageBox(null, {
                type: 'info',
                message: 'Saved successfully',
                buttons: ['Ok']
            });
        } catch (error) {
            dialog.showMessageBox(null, {
                type: 'error',
                message: 'Some error has occured, contact the developer',
                buttons: ['Ok']
            });
            console.log(error);
        }

    } else {
        dialog.showMessageBox(null, {
            type: 'info',
            message: 'Nothing to save or update!',
            buttons: ['Ok']
        });
    }
}

function deleteSetting(key) {
    if (!localChanges.deleted) localChanges.deleted = {};
    if (!localChanges.deleted[current_tab]) localChanges.deleted[current_tab] = {};
    localChanges.deleted[current_tab][key] = true;
    displaySettings(current_tab);
}

