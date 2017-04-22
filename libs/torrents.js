const webtorrent = require('webtorrent'),
    moment = require('moment'),
    path = require('path'),
    Promise = require('bluebird');

const exampleTorrent = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent';
const filePath = path.join(process.cwd() + '/downloadingTorrents');

class torrentHandler {
    constructor(mongo) {
        this.mongo = mongo;
        this.db = this.mongo.db;
        this.models = {
            torrents: this.db.collection('torrents'),
        };
        this.torrentClient = new webtorrent();
    }

    downloadTorrent(url = exampleTorrent, path = filePath) {
        return new Promise((resolve, reject) => {
            return this.torrentClient.add(url, {path}, torrent => {
                torrent.on('done', () => {

                    const {name} = torrent;

                    console.log('completed downloading torrent', name);

                    return this.saveTorrentInfo(name).then(() => resolve(torrent));

                });

                torrent.on('download', bytes => {
                    // console.log('just downloaded: ' + (Number(bytes) / 1000) + ' Kb');
                    // console.log('total downloaded: ' + torrent.downloaded);
                    // console.log('download speed: ' + (Math.floor(Number(torrent.downloadSpeed) / 1000)).toFixed(0) + ' Kb/s');
                    console.log(`progress: ${(torrent.progress * 100).toFixed(0)}%`)
                });

                torrent.on('error', err => {
                    reject(err);
                });


            });
        })

    }

    saveTorrentInfo(name) {
        return this.models.torrents.updateOne({name}, {
            completed: true,
            completedAt: moment().format('YYY-MM-DD hh:mm A'),
        });
    }

    returnVerifiedTorrents(torrents) {
        return Promise.filter(torrents, t => t.verified);
    }

    sortByRatio(results) {

        return results.sort((a, b) => b.seeders - a.seeders);

    }

    getRatio(leechers, seeders) {
        return Math.floor(parseFloat(seeders) / parseFloat(leechers));
    }
}

module.exports = torrentHandler;