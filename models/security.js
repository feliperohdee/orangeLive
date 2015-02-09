// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
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
    var context = vm.createContext(_getValidatorContext(object.set));

    return Promise.try(function () {
        // # Schema (solve async, compile async functions and replace with static result)
        if (schema) {
            //
            var tasks = [];

            // Seek for "mustExists" function
            _.each(schema, function (rule, key) {
                var asyncRules = rule.match(/(mustExists)\(["'].*["']\)/g);

                if (asyncRules) {
                    // Iterate over all "mustExists" in this rule
                    asyncRules.forEach(function (asyncRule) {
                        // Push tasks in an array to be monitored via Promise.all
                        tasks.push(vm.runInContext(asyncRule, context).then(function (response) {
                            // Replace schema rule with static value
                            schema[key] = rule.replace(asyncRule, response);
                        }));
                    });
                }
            });

            return Promise.all(tasks);
        }
    }).then(function () {
        // Create Result Stack
        return {
            acl: true,
            outOfKeys: [],
            outOfRules: []
        };
    }).then(function (resultStack) {
        // # ACL's
        if (acl) {
            resultStack.acl = !vm.runInContext(acl._write, context);
        }

        return resultStack;
    }).then(function (resultStack) {
        // # Schema (solve keys)
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;

            // Test schema keys
            if (!acceptOther) {
                // Iterate over value keys and test if it exists in schema keys
                _.each(_.keys(context.value), function (key) {
                    if (key !== '_other' && !schema[key]) {
                        resultStack.outOfKeys.push(key);
                    }
                });
            }
        }

        return resultStack;
    }).then(function (resultStack) {
        // # Schema (solve sync rules)
        if (schema) {
            // Iterate over schema rules and test them
            _.each(schema, function (rule, key) {
                if (key !== '_other' && !vm.runInContext(rule, context)) {
                    resultStack.outOfRules.push(key);
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
            throw new errors.outOfKeysError({
                explanation: 'The provided keys "' + resultStack.outOfKeys.join(',') + '" is/are disallowed and out of schema keys.'
            });
        } else if (resultStack.outOfRules.length) {
            // Schema Rules Error
            throw new errors.outOfRulesError({
                explanation: 'The provided keys "' + resultStack.outOfRules.join(',') + '" is/are disallowed and out of schema rules.'
            });
        }

        return true;
    });
}

// # Set Schema Validator
function _getValidatorContext(value) {
    return {
        // # Auth
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
        // # Must Exists
        mustExists: function (value) {
            //
            return new Promise(function (resolve, reject) {
                setTimeout(function(){
                   resolve(true); 
                }, 1000);
            });
        },
        // # Schema Validator :now
        now: function () {
            return +new Date;
        },
        // # Value
        value: value
    };
}