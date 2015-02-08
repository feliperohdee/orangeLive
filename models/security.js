// # Live Security
var _ = require('lodash');
var errors = require('errors');
var vm = require('vm');

module.exports = {
    canRead: canRead,
    canWrite: canWrite,
    hasKey: hasKey
};

/*----------------------------*/

// # Can Read
function canRead(rules, object) {
    var can = false;

    // Try get from table first
    if (rules[object.table].acl) {
        can = rules[object.table].acl._read;
    } else {
        can = rules.acl._read;
    }

    if (!can) {
        throw new errors.securityError();
    }
}

// # Can Write
function canWrite(rules, object) {
    var errorStack = {
        acl: true,
        outOfKeys: [],
        outOfRules: []
    };

    var acl = rules[object.table] ? rules[object.table].acl || rules[object.table] : false;
    var schema = rules[object.table] ? rules[object.table].schema || rules[object.table] : false;

    // # Security
    var context = vm.createContext(_getValidaorContext(object.set));

    // Evaluate function and return
    if (acl) {
        try {
            errorStack.acl = !vm.runInContext(acl._write, context);
        } catch (err) {
            throw err;
        }
    }

    // # Schema
    if (schema) {
        var acceptOther = _.isBoolean(schema._other) ? schema._other : true;

        // Test schema keys
        if (!acceptOther) {
            // Iterate over value keys and test if it exists in schema keys
            _.each(_.keys(context.value), function (key) {
                if (key !== '_other' && !schema[key]) {
                    errorStack.outOfKeys.push(key);
                }
            });
        }

        // Test schema rules
        _.each(schema, function (rule, key) {
            if (key !== '_other' && !vm.runInContext(rule, context)) {
                errorStack.outOfRules.push(key);
            }
        });
    }

    if (errorStack.acl) {
        // ACL Error
        throw new errors.securityError();
    } else if (errorStack.outOfKeys.length) {
        // Schema Keys Error
        throw new errors.outOfKeysError({
            explanation: 'The provided keys "' + errorStack.outOfKeys.join(',') + '" is/are disallowed and out of schema keys.'
        });
    } else if (errorStack.outOfRules.length) {
        // Schema Rules Error
        throw new errors.outOfRulesError({
            explanation: 'The provided keys "' + errorStack.outOfRules.join(',') + '" is/are disallowed and out of schema rules.'
        });
    }
}

// # Set Schema Validator
function _getValidaorContext(value) {
    return {
        auth: {
            id: 9
        },
        // # Schema Validator :number
        mustBeNumber: function (value) {
            return _.isNumber(value);
        },
        // # Schema Validator :string
        mustBeString: function (value) {
            return _.isString(value);
        },
        // # Schema Validator :now
        now: function () {
            return +new Date;
        },
        // # Value
        value: value
    };
}

// # Has Key
function hasKey(object) {
    if (!object.key) {
        throw new errors.missingKeyError();
    }
}