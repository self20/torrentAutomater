const path = require('path'),
    nt = require('nt'),
    moment = require('moment'),
    Promise = require('bluebird'),
    webtorrent = require('webtorrent'),
    _ = require('lodash'),
    pirateBay = require('thepiratebay');


class controller {
    constructor(mongo, torrents) {
        this.mongo = mongo;
        this.torrents = torrents;
        this.models = {
            mmaEvents: this.mongo.db.collection('mmaEvents'),
            torrents: this.mongo.db.collection('torrents'),
        };


    }


    getEventWithinTimeFrame() {
        return this.models.mmaEvents.find({
            'downloadStatus.event': false,
            'watchedStatus.event': false,
            date: {
                //fixme
                $gte: moment().subtract(7, 'days').toDate(),
                $lte: moment().add(7, 'days').toDate()
            }
        })
            .limit(1)
            .next();
    }

    run() {

        return this.getEventWithinTimeFrame()
            .then(event => pirateBay.search(event.event))
            .then(this.torrents.returnVerifiedTorrents)
            .then(this.torrents.sortByRatio)
            .then(this.flagPrelims)
            .then(this.getBestVideos)
            .then((results) => this.downloadTorrents(results))
            .catch(console.error);
    }


    downloadTorrents(torrents) {


        const uniqueValues = _.uniqBy(torrents, 'magnetLink');

        return this.models.torrents.insertMany(uniqueValues).then(() =>
            Promise.mapSeries(uniqueValues, q => this.torrents.downloadTorrent(q.magnetLink)))
            .catch(err => {
                throw err;
            });

    }

    getBestVideos(torrents) {
        const earlyPrelim = torrents.find(t => t.foundPrelim === true && t.type === 'Early Prelim');
        const prelim = torrents.find(t => t.foundPrelim === true && t.type === 'Prelim');
        const topTorrent = torrents.filter(t => !t.foundPrelim).sort((a, b) => b.seeders - a.seeders)[0];

        return [earlyPrelim, prelim, topTorrent];
    }




    flagPrelims(torrents) {
        return Promise.map(torrents, torrent => {

            const earlyPrelim = new RegExp(/(\d+ Early Prelim?s)/, 'i');
            const prelim = new RegExp(/(\d+ Prelim?s)/, 'i');

            if (torrent.name.search(prelim) !== -1) {
                return Object.assign(torrent, {foundPrelim: true, type: 'Prelim'});
            } else if (torrent.name.search(earlyPrelim) !== -1) {
                return Object.assign(torrent, {foundPrelim: true, type: 'Early Prelim'});
            } else {
                return torrent;
            }

        });
    }

    clearTorrents() {
        return this.models.torrents.deleteMany({});
    }

    enterEventsToDb() {
        const events = [
            {event: 'ufc 210', date: '2017-04-08'},
            {event: 'ufc 211', date: '2017-05-13'},
            {event: 'ufc fight night: swanson v lobov', date: '2017-04-22'},
            {event: 'ufc fight night gustafson teixeira', date: '2017-05-28'},
            {event: 'ufc 212', date: '2017-06-03'},
            {event: 'ufc fight night', date: '2017-06-11'},
            {event: 'ufc 213', date: '2017-07-08'},
            {event: 'ufc fight night', date: '2017-07-08'},
            {event: 'ufc fox 25', date: '2017-07-22'},
            {event: 'ufc 214', date: '2017-07-29'},
        ];

        events.map(event => Object.assign(event, {
            downloadStatus: {
                event: false,
                prelim: false,
                earlyPrelim: false,
            },

            watchedStatus: {
                event: false,
                prelim: false,
                earlyPrelim: false,
            },
            lastSearchDate: null,
            date: moment(event.date, 'YYYY-MM-DD').toDate(),
        }));

        return this.models.mmaEvents.deleteMany({}).then(() =>
            this.models.mmaEvents.insertMany(events).then(result => {
                console.log(`inserted ${result.insertedCount} into db`);
                return result;
            }));


    }

}

module.exports = controller;
