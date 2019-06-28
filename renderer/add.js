'use strict'

const { ipcRenderer, remote } = require('electron')

document.getElementById('todoForm').addEventListener('submit', (evt) => {
    // prevent default refresh functionality of forms
    evt.preventDefault()

    // input on the form
    const formData = {};
    for (let i = 0; i < evt.target.length; i++){
        if (evt.target[i]){
            if (evt.target[i].name && evt.target[i].parentElement.style.display !== 'none')
                formData[evt.target[i].name] = evt.target[i].value;
        } else {
            break;
        }
    }
    const validation = validate(formData);
    if (validation.ok) {
        ipcRenderer.send('add-entry', formData);
        closeThisWindow();
    } else {
        for (const k in validation) {
            const elem = document.getElementById(k);
            elem.classList.add('is-invalid');
        }
    }

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

function validate(formData) {
    const result = {};
    if (!formData.expense_date){
        result.expense_date = false;
    }
    if (!formData.expense_categ){
        result.expense_categ = false;
    }
    if (!formData.expense_sum) {
        result.expense_sum = false;
    }
    if (Object.entries(result).length === 0) {
        result.ok = true;
    }
    return result;
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