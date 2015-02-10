// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var vm = require('vm');

module.exports = {
    //canRead: canRead,
    canWrite: canWrite
};

/*----------------------------*/

// # Can Read
/*
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
 */

// # Can Write
function canWrite(rules, object) {
    //
    var acl = rules[object.table] ? rules[object.table].acl || rules.acl : false;
    var schema = rules[object.table] ? _.clone(rules[object.table].schema) : false;
    var context = vm.createContext(_getContext(object));

    return Promise.try(function () {
        // # Schema (solve async tasks, compile  n' execute async functions and replace with static values)
        if (schema) {
            //
            var tasks = [];

            // Seek for async functions like "attr"
            _.each(schema, function (rule, key) {
                if (key !== '_other') {
                    //
                    var asyncFns = rule.match(/(attr)\(["'].*["']\)/g);

                    if (asyncFns) {
                        // Iterate over all functions in this rule
                        asyncFns.forEach(function (asyncFn) {
                            // Push them to tasks in an array to be monitored via Promise.all
                            tasks.push(vm.runInContext(asyncFn, context).then(function (response) {
                                // Replace schema rule with static value
                                schema[key] = rule.replace(asyncFn, response);
                            }));
                        });
                    }
                }
            });

            return Promise.all(tasks);
        }
    }).then(function () {
        // Create result Stack
        return {
            acl: true,
            outOfKeys: [],
            outOfRules: []
        };
    }).then(function (resultStack) {
        // # ACL's
        if (acl) {
            resultStack.acl = !vm.runInContext(acl._save, context);
        }

        return resultStack;
    }).then(function (resultStack) {
        // # Schema (resolve keys and sync rules)
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;

            // Iterate over value keys
            _.each(_.keys(context.value), function (key) {
                if (key !== '_other') {
                    // if not accept others, test if exists in schema keys
                    if (!acceptOther && !schema[key]) {
                        resultStack.outOfKeys.push(key);
                    }

                    // Test rules
                    if (schema[key] && !vm.runInContext(schema[key], context)) {
                        resultStack.outOfRules.push(key);
                    }
                }
            });
        }
        
        return resultStack;
    }).then(function (resultStack) {
        if (resultStack.acl) {
            // ACL Error
            throw new errors.securityError();
        } else if (resultStack.outOfKeys.length) {
            // Schema Keys Error
            throw new errors.schemaKeysError({
                explanation: 'The provided keys "' + resultStack.outOfKeys.join(',') + '" is/are out of schema keys.'
            });
        } else if (resultStack.outOfRules.length) {
            // Schema Rules Error
            throw new errors.schemaRulesError({
                explanation: 'The provided values, which belongs to key(s) "' + resultStack.outOfRules.join(',') + '" is/are out of schema rules.'
            });
        }

        return true;
    });
}

// # Get context to validator's VM
function _getContext(object) {
    return {
        // # Attr {alias for getAttr}
        attr: function (testedValue) {
            return _getAttr(testedValue, object);
        },
        // # Auth
        auth: {
            id: 9
        },
        // # Schema Validator :boolean
        mustBeBoolean: function (testedValue) {
            return _.isBoolean(testedValue);
        },
        // # Schema Validator :equals
        mustBeEquals: function (testedValue, value) {
            return testedValue === value;
        },
        // # Schema Validator :number
        mustBeNumber: function (testedValue) {
            return _.isNumber(testedValue);
        },
        // # Schema Validator :string
        mustBeString: function (testedValue) {
            return _.isString(testedValue);
        },
        // # Schema Validator :contains
        mustContains: function (value, testedValue) {
            return _.contains(value, testedValue);
        },
        // # Schema Validator :exists
        mustExists: function (testedValue) {
            if (_.isObject(testedValue) || _.isArray(testedValue)) {
                return !_.isEmpty(testedValue);
            }

            return !_.isUndefined(testedValue) && !_.isNull(testedValue);
        },
        // # Schema Validator :now
        now: function () {
            return +new Date;
        },
        // # Value {set when post, data when fetch}
        value: object.set || object.data || {}
    };
}

// # Get Attr Logic
function _getAttr(testedValue, object) {
    // Split test value to override object
    testedValue = testedValue.split('/');

    object = {
        account: object.account,
        table: testedValue[0],
        key: testedValue[1],
        select: testedValue[2] || false
    };

    return Promise.try(function () {
        // Validations
        if (!object.table) {
            throw new errors.missingTableError();
        }

        if (!object.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define item object
        return {
            where: {
                _namespace: [object.account, object.table].join('/'),
                _key: object.key
            }
        };
    }).then(function (itemObject) {
        // Define Select
        if (!object.select) {
            object.select = '_key';
        }

        // Split comma's, and build alias
        var selectArray = object.select.split(',');
        var alias = base.buildAlias(selectArray);

        itemObject.alias = alias.data;
        itemObject.select = alias.map.names.join();

        return itemObject;
    }).then(function (itemObject) {
        // Fetch item
        try {
            return base.item(itemObject).then(function (response) {
                //
                response = base.getObjectValue(response.data, object.select);

                // Wrap string with comma
                if (_.isString(response)) {
                    response = '\'' + response + '\'';
                }

                return response;
            });
        } catch (err) {
            throw err;
        }
    });
}