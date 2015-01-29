// # Live API
var Promise = require('bluebird');
var liveModel = require('../models/live');
var tempAccount = 'dlBSd$ib89$Be2';

var fromToken = {
    account: 'dlBSd$ib89$Be2',
    indexes: {
        string: ['name'],
        number: ['height', 'age']
    }
};

module.exports = {
    item: item,
    query: query
};

/* ======================================================================== */

// # Item
function item(object) {
    // Temporary
    object.namespace = fromToken.account + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.item(object).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Query
function query(object) {
    // emporary
    object.namespace = tempAccount + '/' + object.namespace;

    return liveModel.query(object).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}


