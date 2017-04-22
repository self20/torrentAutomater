require('dotenv').load();

const mongo = require('./libs/mongo');
const mmaEvents = require('./schemas/mmaEvents');


mongo.getConnection().then(database => {
    const Mongo = new mongo();
    console.log('connected to db');
    //return Mongo.db.collection('mmaEvents').deleteMany();
    return Mongo.db.collection('mmaEvents').insertMany(mmaEvents.data).then((results) => {
        console.log('done, inserted ', results.insertedCount);
    })
});