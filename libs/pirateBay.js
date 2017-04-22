const piratebay = require('thepiratebay');


const subcategories = [
    {
        id: '205',
        name: 'TV shows',
    }
];

class controller {
    constructor() {

    }

    static search(string, options) {
        return piratebay.search(string, options)
    }

}
module.exports = controller;
