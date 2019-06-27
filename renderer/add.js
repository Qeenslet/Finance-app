'use strict'

const { ipcRenderer, remote } = require('electron')

document.getElementById('todoForm').addEventListener('submit', (evt) => {
    // prevent default refresh functionality of forms
    evt.preventDefault()

    // input on the form
    console.log(evt.target);
    const formData = {};
    for (let i = 0; i < evt.target.length; i++){
        if (evt.target[i]){
            if (evt.target[i].name && evt.target[i].parentElement.style.display !== 'none')
                formData[evt.target[i].name] = evt.target[i].value;
        } else {
            break;
        }
    }
    //console.log(formData);
    // send todo to main process
    ipcRenderer.send('add-entry', formData)
    closeThisWindow();
});

function toggleType() {
    const sel = document.getElementById('type_select').value;
    const allSelects = document.getElementsByClassName('flow_selector');
    for (let i = 0; i < allSelects.length; i++){
        allSelects[i].style.display = 'none';
    }

    if (sel) {
        const tgt = document.getElementById(sel);
        if (tgt.style.display === 'none'){
            tgt.style.display = 'block';
        }
    }
}

ipcRenderer.on('open-add-window', (event, incomes, spents) => {
    const tgt = document.getElementById('expense_categ_inside');
    let html = '';
    for (const k in spents){
        html += `<option value="${k}">${spents[k]}</option>`;
    }
    const tgt2 = document.getElementById('income_categ_inside');
    let html2 = '';
    for (const c in incomes){
        html2 += `<option value="${c}">${incomes[c]}</option>`;
    }
    tgt.innerHTML = html;
    tgt2.innerHTML = html2;
});
function setInputFilter(textbox, inputFilter) {
    ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
        textbox.addEventListener(event, function() {
            if (inputFilter(this.value)) {
                this.oldValue = this.value;
                this.oldSelectionStart = this.selectionStart;
                this.oldSelectionEnd = this.selectionEnd;
            } else if (this.hasOwnProperty("oldValue")) {
                this.value = this.oldValue;
                this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
            }
        });
    });
}
setInputFilter(document.getElementById("expense_sum"), function(value) {
    return /^\d*\.?\d*$/.test(value);
});
function closeThisWindow() {
    const w = remote.getCurrentWindow();
    w.close();
}