// # Rules Model
var rules = {
    users: {
        // # Access Control List
        acl: {
            _save: 'isBoolean(attr("users/rohde" + 1 + "/subscribed")) && auth.id >= 10',
            _remove: 'auth.id',
            _read: 'isNumber(9) && auth.id && data.age > 0'
        },
        // # Indexes
        indexes: {
            string: ['name'],
            number: ['height', 'age']
        },
        // # Schema
        schema: {
            name: 'isBoolean(attr("users/rohde1/subscribed")) && isString(data.name)',
            age: 'isBoolean(attr("users/rohde" + 1 + "/subscribed")) && isNumber(data.age) && data.age !== 0',
            _other: true
        }
    }
};

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
    if (rules[table] && rules[table].acl) {
        return rules[table].acl;
    }

    return rules.acl || false;
}

// # Indexes
function _getIndexes(table) {
    if (rules[table] && rules[table].indexes) {
        return rules[table].indexes;
    }

    return false;
}

// # Schema
function _getSchema(table) {
    if (rules[table] && rules[table].schema) {
        return rules[table].schema;
    }

    return false;
}