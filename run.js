require('dotenv').load();

const Mongo = require('./libs/mongo');
const Torrents = require('./libs/torrents');

const mmaTorrent = require('./services/mmaTorrents');


Mongo.getConnection().then(database => {
    const mongo = new Mongo();

    const torrents = new Torrents(mongo);

    //const pirateBay = new PirateBay();

    const mma = new mmaTorrent(mongo, torrents);

    //const app = require('./app');

    //app.listen(3000);


    //mma.clearTorrents();

    //mma.handleSearch('ufc 24');

    //const bellator162 = 'magnet:?xt=urn:btih:d77fa9d7ff820addb0f597341aa4c48f7096113c&dn=Bellator+162+Shlemenko+vs+Grove+HDTV+x264-Ebi+%5BTJET%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969';


    //mma.downloadTorrent(bellator162);
    mma.run();
    //mma.enterEventsToDb();
});

