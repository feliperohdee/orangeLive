// # Live API
var _ = require('lodash');
var liveModel = require('../models/live');
var broadcastModel = require('../models/broadcast');
var tempAccount = 'dlBSd$ib89$Be2';

var fromToken = {
    account: 'dlBSd$ib89$Be2',
    indexes: {
        string: ['name'],
        number: ['height', 'age']
    }
};

module.exports = {
    insert: insert,
    item: item,
    query: query,
    subscribe: subscribe,
    update: update,
};

/* ======================================================================== */

// # Insert
function insert(object) {
    // Temporary
    object.namespace = fromToken.account + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.insert(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Item
function item(object) {
    // Temporary
    object.namespace = fromToken.account + '/' + object.namespace;

    return liveModel.item(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Query
function query(object) {
    // temporary
    object.namespace = tempAccount + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.query(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Subscribe
function subscribe(object) {
    // temporary
    object.namespace = tempAccount + '/' + object.namespace;

    return broadcastModel.subscribe(object).then(function (response) {
        return response;
    }).catch(function(err){
        throw err.message;
    });
}

// # Update
function update(object, options) {
    // Temporary
    _.extend(object, options);

    object.namespace = fromToken.account + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.update(object, options).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}