// # Live API
var liveModel = require('../models/live');
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
    return liveModel.del(object);
}

// # Insert
function insert(object, options) {
    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: fromToken.indexes
    });

    return liveModel.insert(object);
}

// # Item
function item(object) {
    //
    return liveModel.item(object);
}

// # Query
function query(object) {
    // Temporary
    object.indexes = fromToken.indexes;

    return liveModel.query(object);
}

// # Update
function update(object, options) {
    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: fromToken.indexes
    });

    return liveModel.update(object);
}