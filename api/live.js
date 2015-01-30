// # Live API
var Promise = require('bluebird');
var _ = require('lodash');
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
    insert: insert,
    item: item,
    query: query,
    update: update
};

/* ======================================================================== */

// # Insert
function insert(object) {
    // Temporary
    object.namespace = fromToken.account + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.insert(object).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Item
function item(object) {
    // Temporary
    object.namespace = fromToken.account + '/' + object.namespace;

    return liveModel.item(object).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Query
function query(object) {
    // temporary
    object.namespace = tempAccount + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.query(object).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Update
function update(object, options) {
    // Temporary
    _.extend(object, options);
    
    object.namespace = fromToken.account + '/' + object.namespace;
    object.indexes = fromToken.indexes;

    return liveModel.update(object, options).then(function (result) {
        return result;
    }).catch(function (err) {
        throw err.message;
    });
}