const mongodb = require('mongodb');
const assert = require('assert');

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

    static handleUpdate(result) {
        assert(result.modifiedCount === 1, 'result.modifiedCount not equal to 1');
        return result;
    }

    static handleInsertion(result) {
        assert(result.insertedCount === 1, 'result.insertedCount not equal to 1');
        return result;
    }


    createMMaTorrentIndex() {
        return db.collection('mmaEvents').createIndex({date: 1}, { unique: true }).then(() =>
            db.collection('mmaEVents').createIndex({event: 1}, { unique: true})
        )
    }

    createTorrentIndex() {
        return db.collection('torrents').createIndex({id: 1 }, { unique: true});
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
