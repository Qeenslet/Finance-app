# Finance-app
House budgeting and expense control app.
For current state a backend server for sync purposes is established.
List of expenses or incomes can be managed locally and then settings can be exportet to the remote server to sync between devices.
Data is stored in SQLite DB.
# Installation
Run `npm install` + `npm run postinstall` to install all packages and fix annoying sqlite3 module failure
`npm start` runs the project
Default settings for incomes or expenses are stored in local .json files and on the first run are transfered to the local database. Later they can be changed through the interface.

