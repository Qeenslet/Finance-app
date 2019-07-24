'use strict'

const { ipcRenderer, remote } = require('electron')

ipcRenderer.on('update', (event, percent, status) => {
    const progressBar = document.getElementById('sync_progress');
    progressBar.setAttribute('aria-valuenow', percent);
    progressBar.setAttribute('style', 'width:' + percent + '%');
    progressBar.innerHTML = percent + '%';
    const statusWindow = document.getElementById('sync_status');
    statusWindow.innerHTML += status + '<br>';
});
ipcRenderer.on('done', (event => {
    const h2 = document.getElementById('process_name');
    h2.innerHTML = 'Sync finished!!!';
    setTimeout(() => {
        closeThisWindow()
    }, 3000);
}));
function closeThisWindow() {
    const w = remote.getCurrentWindow();
    w.close();
}