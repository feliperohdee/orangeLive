// # Live API
var liveModel = require('../models/live');
var rulesModel = require('../models/rules');
var securityModel = require('../models/security');
var _ = require('lodash');

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
    // Fetch table's rules
    var rules = rulesModel.get(object.table);
    
    return securityModel.canDel({
        account: object.account,
        auth: object._auth,
        data: {
            key: object.key
        },
        rules: rules
    }).then(function () {
        return liveModel.del(object);
    });
}

// # Insert
function insert(object, options) {
    // Fetch table's rules
    var rules = rulesModel.get(options.table);

    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: rules.indexes
    });

    return securityModel.canWrite({
        account: object.account,
        auth: object._auth,
        data: object.set,
        rules: rules
    }).then(function () {
        return liveModel.insert(object);
    });
}

// # Item
function item(object) {
    // Fetch table's rules
    var rules = rulesModel.get(object.table);

    return liveModel.item(object).then(function (response) {
        if (response) {
            return securityModel.canRead({
                account: object.account,
                auth: object._auth,
                data: response.data,
                rules: rules
            }).then(function () {
                return response;
            });
        }
    });
}

// # Query
function query(object) {
    // Fetch table's rules
    var rules = rulesModel.get(object.table);

    return liveModel.query(object).then(function (response) {
        if (response) {
            return securityModel.canRead({
                account: object.account,
                auth: object._auth,
                data: response.data,
                rules: rules
            }, true).then(function () {
                return response;
            });
        }
    });
}

// # Update
function update(object, options) {
    // Fetch table's rules
    var rules = rulesModel.get(options.table);

    // Extend object with options n' indexes
    _.extend(object, options, {
        indexes: rules.indexes
    });

    return securityModel.canWrite({
        account: object.account,
        auth: object._auth,
        data: object.set,
        rules: rules
    }).then(function () {
        return liveModel.update(object);
    });
}