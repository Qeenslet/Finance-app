'use strict'


class Settings {
    constructor (myData) {
        this.myData = myData;
        this.incomes_key = 'incomes';
        this.expense_key = 'expense';
        this.api_key = 'api';
    }

    async getIncomes(toEdit = false) {
        const incomes = await this.myData.getSettings(this.incomes_key);
        if (! incomes.length) {
            const defs = require('./incomes');
            for (let k in defs) {
                await this.myData.saveSetting(this.incomes_key, k, defs[k]);
            }
            return defs;
        } else {
            return this.prepareResult(incomes, toEdit);
        }
    }

    async getExpenses(toEdit = false) {
        const expenses = await this.myData.getSettings(this.expense_key);
        if (! expenses.length) {
            const defs = require('./categs');
            for (let k in defs) {
                await this.myData.saveSetting(this.expense_key, k, defs[k]);
            }
            return defs;
        } else {
            return this.prepareResult(expenses, toEdit);
        }
    }

    async getApiSettings (toEdit = false) {
        const api = await this.myData.getSettings(this.api_key);
        if (! api.length) {
            const defs = require('./extapi');
            for (let k in defs) {
                await this.myData.saveSetting(this.api_key, k, defs[k]);
            }
            return defs;
        } else {
            return this.prepareResult(api, toEdit);
        }
    }


    async prepareResult(array, toEdit) {
        if (toEdit) {
            const result = [];
            for (let i = 0; i < array.length; i++) {
                const obj = array[i];
                obj.used = await this.myData.checkSettingUsage(obj.setting_key);
                result.push(obj);
            }
            return result;
        } else {
            const result = {};
            array.forEach(line => {
                result[line['setting_key']] = line['setting_value']
            });
            return result;
        }

    }

    async saveSettings(localChanges) {
        const possible = [];
        possible.push(this.incomes_key);
        possible.push(this.expense_key);
        possible.push(this.api_key);
        for (let i = 0; i < possible.length; i++) {
            if (localChanges[possible[i]]) {
                await this.iterateChangesInSection(localChanges[possible[i]], possible[i]);
            }
        }
        if (localChanges.deleted) {
            for (let i = 0; i < possible.length; i++) {
                if (localChanges.deleted[possible[i]]) {
                    await this.iterateDeletionsInSection(localChanges.deleted[possible[i]], possible[i]);
                }
            }
        }
    }

    async iterateChangesInSection(sectionObj, section) {
        for (let k in sectionObj) {
            const set = await this.myData.getSetting(section, k);
            if (set) {
                await this.myData.updateSetting(section, k, sectionObj[k]);
            } else {
                await this.myData.saveSetting(section, k, sectionObj[k]);
            }
        }
    }

    async iterateDeletionsInSection(sectionObj, section) {
        for (let k in sectionObj) {
            const check = await this.myData.checkSettingUsage(k);
            if (!check) {
                await this.myData.deleteSetting(section, k);
            }
        }
    }


    async applyRemoteSettings(settings) {
        for (let i = 0; i < settings.length; i++) {
            const set = await this.myData.getSetting(settings[i]['section_key'], settings[i]['setting_key']);
            if (set) {
                await this.myData.updateSetting(settings[i]['section_key'], settings[i]['setting_key'], settings[i]['setting_value']);
            } else {
                await this.myData.saveSetting(settings[i]['section_key'], settings[i]['setting_key'], settings[i]['setting_value']);
            }
        }
    }
}
module.exports = Settings;