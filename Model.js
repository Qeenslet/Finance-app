const sqlite3 = require('sqlite3').verbose();
class Model {
    constructor() {
        this.db = new sqlite3.Database('./expenses.db', (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
        this.db.run('CREATE TABLE IF NOT EXISTS expenses (' +
            'expense_id TEXT,' +
            'expense_date TEXT NOT NULL,' +
            'expense_categ TEXT NOT NULL,' +
            'expense_descr TEXT,' +
            'expense_sum TEXT NOT NULL)');
        this.db.run('CREATE TABLE if NOT EXISTS deleted (expense_id TEXT NOT NULL, delete_day TEXT NOT NULL )');
        this.db.run('CREATE TABLE if NOT EXISTS settings (section_key TEXT NOT NULL , setting_key TEXT NOT NULL , setting_value TEXT NOT NULL )');
        this.db.run('CREATE TABLE IF NOT EXISTS operations (command TEXT NOT NULL, chunk_key TEXT, operation_data TEXT NOT NULL)');
    }


    getBalanceInterval(dateStart, dateEnd) {

        return new Promise((resolve, reject) => {
            let sql = 'SELECT expense_id, expense_date, expense_sum, expense_categ, expense_descr FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC';
            this.db.all(sql, [dateStart, dateEnd], function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }

    getExpensesByCategory(categ, dateStart, dateEnd) {

        return new Promise((resolve, reject) => {
            let sql = 'SELECT expense_id, expense_date, expense_sum, expense_categ, expense_descr FROM expenses WHERE expense_categ = ? AND expense_date BETWEEN ? AND ? ORDER BY expense_date DESC';
            this.db.all(sql, [categ, dateStart, dateEnd], function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }

    addExpense(entryData){
        return new Promise((resolve, reject) => {
            if (!entryData.expense_categ ||
                !entryData.expense_date ||
                !entryData.expense_sum) {
                reject('Not enough data!')
            } else {
                let sql = 'INSERT INTO expenses(expense_id, expense_date, expense_categ, expense_descr, expense_sum) VALUES(?, ?, ?, ?, ?)';
                let id;
                let description;
                if (entryData.expense_id) {
                    id = entryData.expense_id;
                } else {
                    id = Math.random().toString(36).substr(2, 10) + entryData.expense_date;
                }
                if (!entryData.expense_descr) description = '';
                else description = entryData.expense_descr;
                const check = this.checkEntry(id);
                check.then(row => {
                    if (row && row.expense_id) {
                        resolve();
                    } else {
                        this.db.run(sql,
                            [id, entryData.expense_date, entryData.expense_categ, description, entryData.expense_sum],
                            (err) => {
                                if (err) reject("Read error: " + err.message);
                                else {
                                    entryData.expense_id = id;
                                    resolve(entryData);
                                }

                            });
                    }
                })
            }
        });
    }

    saveCommand(command, entryData, chunk_key = null) {
        return new Promise((resolve, reject) => {
            let d = JSON.stringify(entryData);
            let sql = 'INSERT INTO operations (command, chunk_key, operation_data) VALUES(?, ?, ?)';
            this.db.run(sql,
                [command, chunk_key, d],
                (err) => {
                    if (err) reject("Write error: " + err.message);
                    else {
                        resolve();
                    }

                });
        });
    }


    closeConnection() {
        this.db.close();
    }

    deleteEntry(entryID) {
        return new Promise((resolve, reject) => {
            let sql = 'DELETE FROM expenses WHERE expense_id = ?';
            this.db.run(sql, [entryID], err => {
               if (err) reject("Delete error: " + err.message);
               else {
                   resolve();
               }
            });
        });
    }

    registerDeletion(entryID) {
        const today = new Date();
        let deletedDay = today.toISOString().split('T')[0];
        const data = {};
        data.expense_id = entryID;
        data.delete_day = deletedDay;
        return this.saveCommand('DEL', data);
    }

    getAllSum() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT SUM(expense_sum) AS total, COUNT(expense_id) AS entries FROM expenses';
            this.db.get(sql, function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(row);
                }
            })
        });
    }

    getAllNumber() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT COUNT(expense_id) AS total FROM expenses';
            this.db.get(sql, function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(row);
                }
            })
        });
    }

    getAllEntries() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT expense_id, expense_date, expense_sum, expense_categ, expense_descr FROM expenses';
            this.db.all(sql, function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }

    getAllDeletions() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT expense_id, delete_day FROM deleted';
            this.db.all(sql, function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }


    checkEntry(id) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT expense_id FROM expenses WHERE expense_id = ?';
            this.db.get(sql, [id], function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(row);
                }
            })
        });
    }


    getLastOperations() {
        return new Promise((resolve, reject) => {
           let sql = 'SELECT command, operation_data FROM operations WHERE chunk_key IS NULL';
           this.db.all(sql, (err, rows) => {
               if (err) reject("Read error: " + err.message);
               else {
                   resolve(rows);
               }
           });
        });
    }


    setChunkKeys (chunk_key) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE operations SET chunk_key = ? WHERE chunk_key IS NULL';
            this.db.run(sql, [chunk_key], err => {
                if (err) reject("Update error: " + err.message);
                else {
                    resolve();
                }
            });
        })
    }


    executeCommand(instruction) {
        const raw = JSON.parse(instruction.operation_data);

        const promises = [];
        promises.push(this.saveCommand(instruction.command, raw, instruction.chunk_key));
        if (instruction.command === 'ADD') {
            console.log('Adding ' + raw.expense_id + ' key: ' + instruction.chunk_key);
            promises.push(this.addExpense(raw));
        } else if (instruction.command === 'DEL') {
            console.log('Deleting ' + raw.expense_id + ' key: ' + instruction.chunk_key);
            promises.push(this.deleteEntry(raw.expense_id))
        }
        return Promise.all(promises);
    }


    getLastChunk() {
        return new Promise((resolve, reject) => {
           let sql = 'SELECT chunk_key FROM operations WHERE chunk_key IS NOT NULL ORDER BY rowid DESC';
            this.db.get(sql, function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    if (row && row.chunk_key) {
                        resolve(row.chunk_key);
                    } else resolve(null);
                }
            })
        });
    }

    getSettings(key) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT setting_key, setting_value FROM settings WHERE section_key = ?';
            this.db.all(sql, [key], function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }

    saveSetting(section, key, value) {
        return new Promise((resolve, reject) => {
            let sql = 'INSERT INTO settings (section_key, setting_key, setting_value) VALUES(?, ?, ?)';
            this.db.run(sql,
                [section, key, value],
                (err) => {
                    if (err) reject("Write error: " + err.message);
                    else {
                        resolve();
                    }

                });
        });
    }


    checkSettingUsage(setting) {
        return new Promise((resolve, reject) => {
           let sql = 'SELECT COUNT(expense_id) AS amt FROM expenses WHERE expense_categ = ?';
            this.db.get(sql, [setting], function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    if (row && row.amt) {
                        resolve(row.amt);
                    } else resolve(null);
                }
            })
        });
    }

    updateSetting(section, key, value) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE settings SET setting_value = ? WHERE section_key = ? AND setting_key = ?';
            this.db.run(sql, [value, section, key], err => {
                if (err) reject("Update error: " + err.message);
                else {
                    resolve();
                }
            });
        })
    }

    getSetting(section, key) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT setting_value FROM settings WHERE section_key = ? AND setting_key = ?';
            this.db.get(sql, [section, key], function(err, row){
                if (err) reject("Read error: " + err.message)
                else {
                    if (row && row.setting_value) {
                        resolve(row.setting_value);
                    } else resolve(null);
                }
            })
        });
    }


    deleteSetting(section, key) {
        return new Promise((resolve, reject) => {
            let sql = 'DELETE FROM settings WHERE section_key = ? AND setting_key = ?';
            this.db.run(sql, [section, key], err => {
                if (err) reject("Delete error: " + err.message);
                else {
                    resolve();
                }
            });
        })
    }

    getUserFinanceSettings() {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT section_key, setting_key, setting_value FROM settings WHERE section_key != ?';
            this.db.all(sql, ['api'], function(err, rows){
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(rows);
                }
            })
        });
    }

}
module.exports = Model;