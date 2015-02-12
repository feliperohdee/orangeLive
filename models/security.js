// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var vm = require('vm');

module.exports = {
    canRead: canRead,
    canWrite: canWrite
};

/*----------------------------*/

// # Can Write
function canWrite(rules, params) {
    //
    var acl = rules[params.table] ? rules[params.table].acl || rules.acl : false;
    var schema = rules[params.table] ? _.clone(rules[params.table].schema) : false;
    var context = vm.createContext(_getContext(params));

    return Promise.try(function () {
        // # Schema (resolve async tasks, compile  n' execute async functions and replace with static values)
        if (schema) {
            //
            var tasks = [];

            // Seek for async functions like "attr"
            _.keys(context.value).forEach(function (key) {
                if (schema[key] && key !== '_other') {
                    //
                    var asyncFns = schema[key].match(/(attr)\(["'].*["']\)/g);

                    if (asyncFns) {
                        // Iterate over all functions in this rule
                        asyncFns.forEach(function (asyncFn) {
                            // Push them to tasks in an array to be monitored via Promise.all
                            tasks.push(vm.runInContext(asyncFn, context).then(function (response) {
                                // Replace schema rule with static value
                                schema[key] = schema[key].replace(asyncFn, response);
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
        if (acl._save) {
            resultStack.acl = !vm.runInContext(acl._save, context);
        }

        return resultStack;
    }).then(function (resultStack) {
        // # Schema (resolve keys and sync rules)
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;

            // Iterate over value keys
            _.keys(context.value).forEach(function (key) {
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

// # Can Read
function canRead(rules, params, isCollection) {
    var acl = rules[params.table] ? rules[params.table].acl || rules.acl : false;
    var context = vm.createContext(_getContext(params));

    return Promise.try(function () {
        // Create result Stack
        return {
            acl: true
        };
    }).then(function (resultStack) {
        // # ACL's
        if (acl._read) {
            if (isCollection) {
                // Create script to run multiple times
                var script = new vm.Script(acl._read);

                resultStack.acl = !_.every(params.data, function (data) {
                    // Update context data
                    context.value = data;

                    return script.runInContext(context);
                });
            }else{
                resultStack.acl = !vm.runInContext(acl._read, context);
            }
        }
        
        return resultStack;
    }).then(function (resultStack) {
        if (resultStack.acl) {
            // ACL Error
            throw new errors.securityError();
        }
        
        return true;
    });
}

// # Get context to validator's VM
function _getContext(params) {
    return {
        // # Attr {alias for getAttr}
        attr: function (attr) {
            return _getAttr(attr, params);
        },
        // # Auth
        auth: {
            userId: 10,
            id: 9
        },
        // # // # Schema Validator
        must: function (testCase, testedValue, value) {
            // Describe test cases
            var testCases = {
                beBoolean: function (testedValue) {
                    return _.isBoolean(testedValue);
                },
                beEquals: function (testedValue) {
                    return testedValue === value;
                },
                beNumber: function (testedValue) {
                    return _.isNumber(testedValue);
                },
                beString: function (testedValue) {
                    return _.isString(testedValue);
                },
                contains: function (testedValue) {
                    return _.contains(value, testedValue);
                },
                exists: function (testedValue) {
                    if (_.isObject(testedValue) || _.isArray(testedValue)) {
                        return !_.isEmpty(testedValue);
                    }

                    return !_.isUndefined(testedValue) && !_.isNull(testedValue);
                }
            };

            // Execute test cases
            return testCases[testCase](testedValue, value);
        },
        // # Schema Validator :now
        now: function () {
            return +new Date;
        },
        // # Value
        value: params.data || {}
    };
}

// # Get Attr Logic
function _getAttr(attr, params) {
    // Split attr to append into params
    attr = attr.split('/');

    // Extend params with attr splitted
    _.extend(params, {
        table: attr[0],
        key: attr[1],
        select: attr[2] || false
    });

    return Promise.try(function () {
        // Validations
        if (!params.table) {
            throw new errors.missingTableError();
        }

        if (!params.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define item object
        return {
            where: {
                _namespace: [params.account, params.table].join('/'),
                _key: params.key
            }
        };
    }).then(function (itemObject) {
        // Define Select
        if (!params.select) {
            params.select = '_key';
        }

        // Split comma's, and build alias
        var selectArray = params.select.split(',');
        var alias = base.buildAlias(selectArray);

        itemObject.alias = alias.data;
        itemObject.select = alias.map.names.join();

        return itemObject;
    }).then(function (itemObject) {
        // Fetch item
        try {
            return base.item(itemObject).then(function (response) {
                //
                response = base.getObjectValue(response.data, params.select);

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