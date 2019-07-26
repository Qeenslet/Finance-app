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
}
module.exports = Settings;