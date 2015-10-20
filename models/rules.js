var _ = require('lodash');
var config = require('.././config.json');

module.exports = {
    get: get
};

/* ======================================================================== */

// # Get Rules
function get(table) {
    return {
        acl: _getAcl(table),
        indexes: _getIndexes(table),
        schema: _getSchema(table)
    };
}

// # ACL's
function _getAcl(table) {
    return _.get(config.rules, table + '.acl', config.rules.acl || false);
}

// # Indexes
function _getIndexes(table) {
    return _.get(config.rules, table + '.indexes', false);
}

// # Schema
function _getSchema(table) {
    return _.get(config.rules, table + '.schema', false);
}
