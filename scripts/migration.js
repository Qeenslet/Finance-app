const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./expenses.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
});
let counter = 0;


function migrate() {
    console.log('Starting migration...');
    console.log('Checking table.');
    db.run('CREATE TABLE IF NOT EXISTS operations (command TEXT NOT NULL, chunk_key TEXT, operation_data TEXT NOT NULL)');
    console.log('Truncating operations table');
    db.run('DELETE FROM operations');
    console.log('Getting all operations');
    const query = getAllEntries();
    query.then(rows => {
        const promises = [];
        rows.forEach(row => {
            let data = JSON.stringify(row);
            let command = 'ADD';
            promises.push(addOperation(command, data));
        });
        Promise.all(promises).then(() => {
            console.log('Entries added: ' + counter);
        })
    }).catch(error => console.log('Error: ' + error));

}

function getAllEntries() {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT expense_id, expense_date, expense_sum, expense_categ, expense_descr FROM expenses';
        db.all(sql, function(err, rows){
            if (err) reject("Read error: " + err.message)
            else {
                resolve(rows);
            }
        })
    });
}

function addOperation(command, data) {
    return new Promise((resolve, reject) => {
        let sql = 'INSERT INTO operations (command, chunk_key, operation_data) VALUES(?, NULL, ?)';
        db.run(sql,
            [command, data],
            (err) => {
                if (err) reject("Write error: " + err.message);
                else {
                    counter++;
                    resolve();
                }

            });
    });

}

migrate();
