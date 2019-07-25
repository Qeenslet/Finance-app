'use strict'

const fetch = require("node-fetch");
class Synchronizator {
    constructor(MyData, settings, window) {
        this.myData = MyData;
        this.settings = settings;
        this.window = window;
        this.percent = 0;
    }

    syncronize() {
        this.percent++;
        this.updateWindow('Starting...');
        const rem = this.requestRemoteSummary();
        rem.then(remote => {
            this.percent++;
            this.updateWindow('Recieved response from remote server, looking for differences...');
            const loc = this.myData.getAllSum();
                loc.then(local => {
                    this.compare(remote.summary, local);
                })
            });

    }

    async compare(remote, local) {
        this.percent++;
        //remote.sum, remote.entries local.total, local.entries
        if (remote.sum != local.total) {
            if (remote.entries == 0) {
                this.uploadOperations();
            } else {
                //request chunks
                //this.uploadOperations();
                try {
                    const chunk_key = await this.myData.getLastChunk();
                    this.updateWindow('Last chunk is ' + chunk_key);
                    const remoteChunks = await this.recieveChunks(chunk_key);
                    const doChunks = await this.executeRemoteChunks(remoteChunks, chunk_key);
                    this.uploadOperations();
                } catch(error) {
                    this.terminateUpdate();
                    console.log(error);
                }
            }
        } else {
            this.percent = 100;
            this.updateWindow('Data is up to date!!!');
            this.terminateUpdate();
        }


    }


    uploadOperations() {
        this.updateWindow('Preparing data for upload');
        const query = this.myData.getLastOperations();
        query.then(rows => {
            if (rows && rows.length > 0) {
                const send = this.sendOperationsToRemote(rows);
                this.updateWindow('Uploading...');
                send.then(response => {
                    if (response.chunk_key) {
                        this.updateWindow('Chunk key recieved, updating local data...');
                        const update = this.myData.setChunkKeys(response.chunk_key);
                        update.then(() => {
                            setTimeout(() => this.syncronize(), 4000);
                        })
                    } else {
                        this.updateWindow('Server-side error retrieving chunk key, terminating...');
                        console.log(response);
                        this.terminateUpdate();
                    }
                })
            } else {
                this.updateWindow('No new entries to upload...');
                this.updateWindow('Terminating...');
                this.terminateUpdate();
            }
        });
    }

    requestRemoteSummary() {
        let apiString = this.settings.server + "/" + this.settings.apikey + "/summary";
        return fetch(apiString).then(response => response.json());
    }


    sendOperationsToRemote(operations) {
        let apiString = this.settings.server + "/" + this.settings.apikey + "/operations";
        let d = JSON.stringify(operations);
        return fetch(apiString, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: d
        }).then(response => {
            return response.json()
        });
    }

    recieveChunks (chunk_key) {
        let apiString;
        if (chunk_key) {
            apiString = this.settings.server + "/" + this.settings.apikey + "/next_chunks/" + chunk_key
        } else {
            apiString = this.settings.server + "/" + this.settings.apikey + "/chunks";
        }
        return fetch(apiString).then(response => response.json());
    }


    getChunkOperations(chunk_key) {
        let apiString = this.settings.server + "/" + this.settings.apikey + "/chunk/" + chunk_key;
        return fetch(apiString).then(response => response.json());
    }


    updateWindow(message) {
        this.window.webContents.send('update', this.percent, message);
        console.log(message);
    }

    terminateUpdate() {
        this.window.webContents.send('done');
    }


    async executeRemoteChunks(data, chunk_key) {
        return new Promise(async (resolve, reject) => {
            if (data.chunks) {
                let step = parseInt((100 - this.percent) / data.chunks.length);
                this.updateWindow('chunks recieved');
                if (data.chunks.length == 0 || (data.chunks.length === 1 && data.chunks[0]['chunk_key'] === chunk_key)) {
                    this.updateWindow('No new chunks...');
                    resolve();
                }
                console.log(data.chunks);
                //const proms = [];

                const chunkResolve = await this.queueChunks(data.chunks, step);

                resolve();
            } else {
                this.updateWindow('No data recieve about chunks');
                resolve();
            }
        });
    }

    runChunk(chunk, step) {
        return new Promise((resolve) => {
            const promises = [];
            promises.push(this.getChunkOperations(chunk.chunk_key));
            this.updateWindow('requesting chunk key: ' + chunk.chunk_key);
            Promise.all(promises).then((bunch) => {
                const proms = [];
                bunch.forEach(operations => {
                    this.percent += step;
                    if (this.percent >= 100) this.percent = 99;
                    if (operations.operations) {
                        operations.operations.forEach(instruction => {
                            proms.push(this.myData.executeCommand(instruction));
                        });
                    }
                });
                return Promise.all(proms);
            }).then(() => resolve());
        });
    }
    async queueChunks (chunks, step) {
        for (let index = 0; index < chunks.length; index++) {
            await this.runChunk(chunks[index], step);
        }
    }




}

module.exports = Synchronizator;