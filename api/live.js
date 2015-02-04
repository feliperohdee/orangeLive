// # Live API
var liveModel = require('../models/live');
var broadcastModel = require('../models/broadcast');
var _ = require('lodash');

var fromToken = {
    indexes: {
        string: ['name'],
        number: ['height', 'age']
    }
};

module.exports = {
    del: del,
    insert: insert,
    item: item,
    query: query,
    update: update
};

/* ======================================================================== */

// # Del
function del(object) {
    //
    return liveModel.del(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Insert
function insert(object, options) {
    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: fromToken.indexes
    });

    return liveModel.insert(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Item
function item(object) {
    //
    return liveModel.item(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Query
function query(object) {
    // Temporary
    object.indexes = fromToken.indexes;

    return liveModel.query(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}

// # Update
function update(object, options) {
    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: fromToken.indexes
    });

    return liveModel.update(object).then(function (response) {
        return response;
    }).catch(function (err) {
        throw err.message;
    });
}