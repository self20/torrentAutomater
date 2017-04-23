const mongodb = require('mongodb');


let db = {};

class controller {
    constructor() {
        this.db = db;
    }
    static getConnection() {
        return mongodb.MongoClient.connect(process.env.DB_URI).then(database => {
            db = this.db = database;
            return database;
        });
    }

    createMMaTorrentIndex() {
        return db.collection('mmaEvents').createIndex({date: 1}, { unique: true }).then(() =>
            db.collection('mmaEVents').createIndex({event: 1}, { unique: true})
        )
    }

    createTorrentIndex() {
        return db.collection('torrents').createIndex({id: 1, magnetLink: true }, { unique: true});
    }

    clearAll() {
        return Promise.all([
            db.collection('torrents').deleteMany({}),
            db.collection('mmaEvents').deleteMany({}),
        ]);
    }

    init() {
        return this.clearAll().then(this.createMMaTorrentIndex).then(this.createTorrentIndex);
    }
}

module.exports = controller;
