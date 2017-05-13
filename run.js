require('dotenv').load();

const Mongo = require('./libs/mongo');
const Torrents = require('./libs/torrents');

const mmaTorrent = require('./services/mmaTorrents');

//const app = require('./app');

Mongo.getConnection().then(database => {
    const mongo = new Mongo();

    const torrents = new Torrents(mongo);

    //const pirateBay = new PirateBay();

    const mma = new mmaTorrent(mongo, torrents);


    //const bellator162 = 'magnet:?xt=urn:btih:d77fa9d7ff820addb0f597341aa4c48f7096113c&dn=Bellator+162+Shlemenko+vs+Grove+HDTV+x264-Ebi+%5BTJET%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969';


    //mma.downloadTorrent(bellator162);

    //mongo.clearAll().then(() => mma.enterEventsToDb()).then(() => mma.run());

    mma.run();

    //torrents.downloadTorrent('magnet:?xt=urn:btih:85bacf99b1c19a6be785f0062b381a11c55af8a5&dn=Bellator+178+HDTV+x264-VERUM+%5BTJET%5D&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969');

    //mma.enterEventsToDb();
});



//app.listen(3000);




