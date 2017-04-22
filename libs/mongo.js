const mongodb = require('mongodb');

let db;

class controller {
    constructor() {
        this.db = db;

    }
    static getConnection() {
        return mongodb.MongoClient.connect(process.env.DB_URI).then(database => {
            db = database;
            return database;
        });
    }
}

module.exports = controller;
