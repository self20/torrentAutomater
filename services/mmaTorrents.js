const path = require('path'),
    moment = require('moment'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    pirateBay = require('thepiratebay'),
    assert = require('assert');


class controller {
    constructor(mongo, torrents) {
        this.mongo = mongo;
        this.torrents = torrents;
        this.models = {
            mmaEvents: this.mongo.db.collection('mmaEvents'),
            torrents: this.mongo.db.collection('torrents'),
        };

        this.downloadedEvents = [];


    }


    getEventWithinTimeFrame() {
        return this.models.mmaEvents.find({
            //'downloadStatus.event': false,
            date: {
                $gte: moment().subtract(7, 'days').toDate(),
                $lte: moment().add(7, 'days').toDate(),
            }
        })
            .limit(1)
            .next().then(mmaEvent => {
                if (mmaEvent && mmaEvent.hasOwnProperty('downloadStatus')) {
                    if (mmaEvent.downloadStatus.event) {
                        this.downloadedEvents.push('Event');
                    }
                    if (mmaEvent.downloadStatus.prelim) {
                        this.downloadedEvents.push('Prelim');
                    }
                    if (mmaEvent.downloadStatus.earlyPrelim) {
                        this.downloadedEvents.push('Early Prelim');
                    }
                    if (mmaEvent.downloadStatus.bellator) {
                        this.downloadedEvents.push('Bellator');
                    }
                }
                return mmaEvent;
            })
    }

    returnTopBellatorResult() {
        return pirateBay.search('Bellator')
            .then(this.torrents.sortBySeeders)
            .then((torrents) => torrents[0]).then(torrent => {
                assert(moment(torrent.date).isAfter(moment().subtract(1, 'week')));
                return Object.assign(torrent, { type: 'Bellator'});
            }).catch(err => {
                throw err;
            })
    }

    run() {

        return this.getEventWithinTimeFrame().then(event => Promise.all([
                pirateBay.search(event.event),
                this.updateDocWhileSearching(event.event)
            ]).spread((searchResult, _) =>
                this.torrents.returnVerifiedTorrents(searchResult)
                    .then(this.torrents.sortBySeeders)
                    .then(this.flagPrelims)
                    .then(this.getBestVideos)
                    .then((results) => this.returnTopBellatorResult()
                        .then(bellatorTorrent =>
                            this.downloadTorrents(results.concat(bellatorTorrent))
                        )
                    )
            ))
            .catch(console.error);
    }


    updateDocWhileSearching(event) {
        return this.models.mmaEvents.updateOne(
            {event}, //filter

            {$set: {lastSearchDate: new Date()}}, //update

            {upsert: false, multi: false}
        ).then(this.handleUpdate);
    }


    downloadTorrents(torrents) {


        const filteredUndefined = torrents.filter(t => t && t.hasOwnProperty('magnetLink'));


        const uniqueValues = _.uniqBy(filteredUndefined, 'magnetLink');

        const nonDownloadedTorrents = uniqueValues.filter(torrent =>
            !this.downloadedEvents.find(i => i === torrent.type));


        if (nonDownloadedTorrents.length > 0) {
            return Promise.map(nonDownloadedTorrents, torrent =>
                    this.torrents.handleDownload(torrent)
                    .then(() => this.handleCompletedTorrent(torrent))
            );

        } else {
            console.log('did not download torrents');
        }
    }



    //handles generic assertion testing of document

    handleInsertion(result) {
        assert(result.insertedCount === 1, 'result.insertedCount not equal to 1');
        return result;
    }

    handleUpdate(result) {
        assert(result.modifiedCount === 1, 'result.modifiedCount not equal to 1');
        return result;
    }

    //fixme: handle joining torrent and mma
    handleCompletedTorrent(torrent) {
        const {name, type} = torrent;

        if (type === 'UFC') {
            return this.models.mmaEvents.updateOne({
                date: {
                    $gte: moment().subtract(7, 'days').toDate(),
                    $lte: moment().add(7, 'days')
                }
            }, {
                $set: {
                    'downloadStatus.event': true,

                },
            }).then(this.handleUpdate);

        } else if (type === 'Early Prelim') {
            return this.models.mmaEvents.updateOne({
                date: {
                    $gte: moment().subtract(7, 'days').toDate(),
                    $lte: moment().add(7, 'days').toDate()
                }
            }, {
                $set: {'downloadStatus.earlyPrelim': true},
            }).then(this.handleUpdate);

        } else if (type === 'Prelim') {
            return this.models.mmaEvents.updateOne({
                date: {
                    $gte: moment().subtract(7, 'days').toDate(),
                    $lte: moment().add(7, 'days').toDate()
                }
            }, {
                $set: { 'downloadStatus.prelim': true },
            }).then(this.handleUpdate);

        } else if (type === 'Bellator') {
            return this.models.mmaEvents.updateOne({
                date: {
                    $gte: moment().subtract(7, 'days').toDate(),
                    $lte: moment().add(7, 'days').toDate()
                }
            }, {
                $set: {
                    'downloadStatus.bellator': true,
                }

            }).then(this.handleUpdate);
        }
    }


    getBestVideos(torrents) {

        const earlyPrelim = torrents.find(t => t.foundPrelim === true && t.type === 'Early Prelim');
        const prelim = torrents.find(t => t.foundPrelim === true && t.type === 'Prelim');
        const topTorrent = torrents.filter(t => !t.foundPrelim).sort((a, b) => b.seeders - a.seeders)[0];

        //todo assign topTorrent a type

        return [earlyPrelim, prelim, topTorrent].filter(t => t);
    }


    flagPrelims(torrents) {
        return Promise.map(torrents, torrent => {

            const earlyPrelim = new RegExp(/(Early Prelims?)/, 'i');
            const prelim = new RegExp(/(Prelims?)/, 'i');

            if (torrent.name.search(earlyPrelim) !== -1) {
                return Object.assign(torrent, {foundPrelim: true, type: 'Prelim'});
            } else if (torrent.name.search(prelim) !== -1) {
                return Object.assign(torrent, {foundPrelim: true, type: 'Early Prelim'});
            } else {
                return torrent;
            }

        });
    }


    enterEventsToDb() {
        const events = [
            //{event: 'ufc 210', date: '2017-04-08'},
            {event: 'ufc fight night 108', date: '2017-04-22'},
            {event: 'ufc 211', date: '2017-05-13'},
            {event: 'ufc fight night 109', date: '2017-05-28'},
            {event: 'ufc 212', date: '2017-06-03'},
            {event: 'ufc fight night 110', date: '2017-06-11'},
            {event: 'ufc 213', date: '2017-07-08'},
            {event: 'ufc fight night 113', date: '2017-07-16'},
            {event: 'ufc fox 25', date: '2017-07-22'},
            {event: 'ufc 214', date: '2017-07-29'},
            {event: 'ufc 216', date: '2017-10-21'},
            {event: 'ufc 220', date: '2017-12-30'}
        ];

        events.map(event => Object.assign(event, {
            downloadStatus: {
                event: false,
                prelim: false,
                earlyPrelim: false,
                bellator: false,
            },
            lastSearchDate: null,
            date: moment(event.date, 'YYYY-MM-DD').toDate(),
        }));


        return this.models.mmaEvents.deleteMany({date: {$gte: new Date()}}).then(() =>
            this.models.mmaEvents.insertMany(events).then(result => {
                assert(result.insertedCount === events.length);
                return result;
            }));


    }

}

module.exports = controller;