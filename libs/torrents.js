const webtorrent = require('webtorrent'),
    moment = require('moment'),
    path = require('path'),
    Promise = require('bluebird'),
    assert = require('assert');

const exampleTorrent = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent';
const filePath = path.join(process.cwd(), 'downloadingTorrents');

class torrentHandler {
    constructor(mongo) {
        this.mongo = mongo;
        this.db = this.mongo.db;
        this.models = {
            torrents: this.db.collection('torrents'),
        };
        this.torrentClient = new webtorrent();

        this.torrentClient.on('error', (err) => {
            throw err;
        });


    }


    downloadTorrent(url = exampleTorrent, path = filePath) {
        return new Promise((resolve, reject) =>
            this.torrentClient.add(url, {path}, torrent => {
                torrent.on('done', () => {

                    const {dn} = torrent;

                    console.log('completed downloading ', dn);

                    return this.saveTorrentInfo(dn).then(() => resolve(torrent));

                });

                torrent.on('download', bytes => {
                    // console.log('just downloaded: ' + (Number(bytes) / 1000) + ' Kb');
                    // console.log('total downloaded: ' + torrent.downloaded);
                    console.log('download speed: ' + (Math.floor(Number(torrent.downloadSpeed) / 1000)).toFixed(0) + ' Kb/s');
                    console.log(`progress: ${(torrent.progress * 100).toFixed(0)}%`)
                });

                torrent.on('error', err => reject(err));


            })
        )

    }
    insertNewTorrentIntoDb(torrent) {
        return this.models.torrents.insertOne(Object.assign(torrent,
            {
                downloading: true,
                completed: false,
                startedAt: new Date(),
            }
        )).then(this.mongo.handleInsertion).then(() => {
            return torrent;
        });

    }

    updateTorrent(torrent) {
        return this.models.torrents.updateOne({id: torrent.id}, {
            $set: {
                downloading: true,
                completed: false,
                startedAt: new Date,
            }
        }, { upsert: false }).then(this.mongo.handleUpdate).then(() => {
            return torrent;
        })
    }


    updateCompletedTorrentIntoDb(torrent) {
        return this.models.torrents.updateOne({
            id: torrent.id,
        }, {
            $set: {
                downloading: false,
                completed: true,
                completedAt: new Date()
            }
        }, { upsert: false }).then(result => {
            assert(result.modifiedCount === 1);
            return result;
        });
    }

    handleDownload(torrent) {
        return this.checkIfInDb(torrent).then(result => {
            if (result === false) {
                return this.insertNewTorrentIntoDb(torrent).then(() =>
                    this.downloadTorrent(torrent.magnetLink)).then(() =>
                    this.updateCompletedTorrentIntoDb(torrent)
                )
                //fixme
            } else {
                if (result && result.hasOwnProperty('')) {
                    return this.updateTorrent(torrent).then(() =>
                        this.downloadTorrent(torrent.magnetLink).then(() =>
                            this.updateCompletedTorrentIntoDb(torrent)
                        )
                    );
                }
                console.log(`torrent ${torrent.name} is already in db`);
                return;
            }
        });
    }

    checkIfInDb(torrent) {
        return this.models.torrents.find({id: torrent.id}).limit(1).next().then(result => {
            if (result && result.hasOwnProperty('completed') && result.completed) {
                return true;
            } else {
                return false;
            }

        });
    }

    saveTorrentInfo(name) {


        return this.models.torrents.updateOne({name}, {
            $set: {
                completed: true,
                downloading: false,
                completedAt: new Date(),
            }

        }).then(result => {
            assert(result.matchedCount === 1);
            assert(result.modifiedCount === 1);
            assert(result.upsertedCount === 0);

            return result;
        }).catch(err => {
            throw err;
        })
    }

    returnVerifiedTorrents(torrents) {
        return Promise.filter(torrents, t => t.verified);
    }

    sortBySeeders(results) {

        return results.sort((a, b) => b.seeders - a.seeders);

    }

    getRatio(leechers, seeders) {
        return Math.floor(parseFloat(seeders) / parseFloat(leechers));
    }
}

module.exports = torrentHandler;