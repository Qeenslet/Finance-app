'use strict'
const { ipcRenderer, remote } = require('electron');
const { dialog } = require('electron').remote;
const Sets = require('../Settings');
const Model = require('../Model');
const syncronizator = require('../Synchronizator');

const myData = new Model();
const mySettings = new Sets(myData);
const default_tab = 'incomes';
let current_tab;
let localChanges;

ipcRenderer.on('display-setts', event => {
    localChanges = {};
    displaySettings(default_tab);
});

ipcRenderer.on('update', (event, percent, status) => {
    const progressBar = document.getElementById('sync_progress');
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.setAttribute('style', 'width:' + percent + '%');
    progressBar.innerHTML = percent + '%';
    const statusWindow = document.getElementById('sync_status');
    statusWindow.innerHTML += '<p><small>' + status + '</small></p>';
    statusWindow.scrollTop = statusWindow.scrollHeight;
});

async function displaySettings(key) {
    current_tab = key;
    let array;
    unfocusTabs();
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
    const container1 = document.getElementById('mainSetting');
    const container2 = document.getElementById('syncSetting');

    if (tab !== 'sync') {
        container1.style.display = 'block';
        container2.style.display = 'none';
        displaySettings(tab);
    } else {
        container1.style.display = 'none';
        container2.style.display = 'block';
        unfocusTabs();
        const tab = document.getElementById('sync_tab');
        tab.classList.add('active');
    }

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

async function pushSettings() {
    try {
        const settings = await myData.getUserFinanceSettings();
        const api_settings = await mySettings.getApiSettings();
        const w = remote.getCurrentWindow();
        const sync = new syncronizator(myData, api_settings, w);
        const response = await sync.postSettings(settings);
        if (response.settings) {
            dialog.showMessageBox(null, {
                type: 'info',
                message: 'Local settings successfully saved',
                buttons: ['Ok']
            });
        } else {
            dialog.showMessageBox(null, {
                type: 'error',
                message: 'Remote server unavailable',
                buttons: ['Ok']
            });
        }
    } catch (error) {
        dialog.showMessageBox(null, {
            type: 'error',
            message: 'Some error has happened, contact the developer',
            buttons: ['Ok']
        });
        console.log(error);
    }
}

async function getRemoteSettings() {
    try {
        const api_settings = await mySettings.getApiSettings();
        const w = remote.getCurrentWindow();
        const sync = new syncronizator(myData, api_settings, w);
        const rem = await sync.getSettings();
        await mySettings.applyRemoteSettings(rem);
        dialog.showMessageBox(null, {
            type: 'info',
            message: 'Remote changes has been applied!',
            buttons: ['Ok']
        });
    } catch (e) {
        dialog.showMessageBox(null, {
            type: 'error',
            message: 'Some error has happened, contact the developer',
            buttons: ['Ok']
        });
        console.log(e);
    }

}


function unfocusTabs() {
    const tabs = document.getElementsByClassName('nav-link');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
}

