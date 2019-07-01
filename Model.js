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
            'expense_sum TEXT NOT NULL)')
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
            let sql = 'SELECT expense_id, expense_date, expense_sum, expense_categ, expense_descr FROM expenses WHERE expense_categ = ? AND expense_date BETWEEN ? AND ?';
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
                let id = Math.random().toString(36).substr(2, 10) + entryData.expense_date;
                let description;
                if (!entryData.expense_descr) description = '';
                else description = entryData.expense_descr;
                this.db.run(sql,
                    [id, entryData.expense_date, entryData.expense_categ, description, entryData.expense_sum],
                    (err) => {
                        if (err) reject("Read error: " + err.message);
                        else {
                            resolve();
                        }

                    });
            }
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
}
module.exports = Model;