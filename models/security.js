// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var Evaluator = require('./evaluator');
var vm = require('vm');
var staticContext;

__construct();

module.exports = {
    canDel: canDel,
    canRead: canRead,
    canWrite: canWrite,
    filterClients: filterClients
};

/*----------------------------*/

// # Constructor
function __construct() {
    staticContext = _getStaticContext();
}

// # Can Del
function canDel(params) {
    var aclRule = params.rules.acl && params.rules.acl._remove ? params.rules.acl._remove : false;
    var context = vm.createContext(_getContext(params));
    var errorStack = {
        acl: true
    };

    return Promise.try(function () {
        // # Validate ACL's
        if (aclRule) {
            // Define resolver function
            var resolveAcl = function (rule) {
                errorStack.acl = !vm.runInContext(rule, context);
            };

            // Test if is there async functions
            var asyncFns = _isAsyncFns(aclRule);

            if (!asyncFns) {
                // If no async function, just resolve and keep processing
                resolveAcl(aclRule);
            } else {
                // Otherwise, resolve asynchronous functions first
                return _resolveAsyncFns(asyncFns, aclRule, context).then(function (staticRule) {
                    // After done resolve 
                    resolveAcl(staticRule);
                });
            }
        }
    }).then(function () {
        if (errorStack.acl) {
            // ACL Error
            throw new errors.securityError();
        }

        return true;
    });
}

// # Can Read
function canRead(params, isCollection) {
    var acl = params.rules.acl && params.rules.acl._read ? params.rules.acl._read : false;
    var evaluator = new Evaluator({}, params);

    return Promise.try(function () {
        // # Validate ACL's
        if (acl) {
            if (isCollection) {
                return Promise.each(params.data, function (data) {
                    // Update context data
                    evaluator.updateData(data);

                    return evaluator.parse(acl).then(function (response) {
                        if (!response) {
                            // ACL Error
                            throw new errors.securityError();
                        }
                    });
                });
            } else {
                return evaluator.parse(acl).then(function (response) {
                    if (!response) {
                        // ACL Error
                        throw new errors.securityError();
                    }
                });
            }
        }
    });
}

// # Can Write
function canWrite(params) {
    //
    var aclRule = params.rules.acl && params.rules.acl._save ? params.rules.acl._save : false;
    var context = vm.createContext(_getContext(params));
    var schema = params.rules.schema;
    var errorStack = {
        acl: true,
        outOfKeys: [],
        outOfRules: []
    };

    return Promise.try(function () {
        // # Validate ACL's
        if (aclRule) {
            // Define resolver function
            var resolveAcl = function (rule) {
                errorStack.acl = !vm.runInContext(rule, context);
            };

            // Test if is there async functions
            var asyncFns = _isAsyncFns(aclRule);

            if (!asyncFns) {
                // If no async function, just resolve and keep processing
                resolveAcl(aclRule);
            } else {
                // Otherwise, resolve asynchronous functions first
                return _resolveAsyncFns(asyncFns, aclRule, context).then(function (staticRule) {
                    // After done resolve 
                    resolveAcl(staticRule);
                });
            }
        }
    }).then(function () {
        // # Validate Schema
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;
            var asyncTasks = [];

            // Define resolver function
            var resolveRule = function (key, rule) {
                if (!vm.runInContext(rule, context)) {
                    errorStack.outOfRules.push(key);
                }
            };

            // Iterate over data keys to seek for schema rules
            _.chain(context.data).keys().each(function (key) {
                //
                var schemaRule = schema[key];

                // Test schema keys
                if (!acceptOther && !schemaRule) {
                    errorStack.outOfKeys.push(key);
                }

                // Test schema rules
                if (schemaRule) {
                    // Test if is there async functions
                    var asyncFns = _isAsyncFns(schemaRule);

                    if (!asyncFns) {
                        // If no async function, just resolve and keep processing
                        resolveRule(key, schemaRule);
                    } else {
                        // Otherwise, create tasks to resolve asynchronous functions first
                        asyncTasks.push(_resolveAsyncFns(asyncFns, schemaRule, context).then(function (staticRule) {
                            // After done resolve 
                            resolveRule(key, staticRule);
                        }));
                    }
                }
            }).value();

            // If is there async functions, wait for all done
            if (asyncTasks.length) {
                return Promise.all(asyncTasks);
            }
        }
    }).then(function () {
        if (errorStack.acl) {
            // ACL Error
            throw new errors.securityError();
        } else if (errorStack.outOfKeys.length) {
            // Schema Keys Error
            throw new errors.schemaKeysError({
                explanation: 'The provided keys "' + errorStack.outOfKeys.join(',') + '" is/are out of schema keys.'
            });
        } else if (errorStack.outOfRules.length) {
            // Schema Rules Error
            throw new errors.schemaRulesError({
                explanation: 'The provided values, which belongs to key(s) "' + errorStack.outOfRules.join(',') + '" is/are out of schema rules.'
            });
        }

        return true;
    });
}

// # Filter Clients {use for socket}
function filterClients(params) {
    //
    var aclRule = params.rules.acl && params.rules.acl._read ? params.rules.acl._read : false;
    var context = vm.createContext(_getContext(params));
    var clients = [];

    return Promise.try(function () {
        // # Validate ACL's
        if (aclRule) {
            // Define resolver function
            var resolveAcl = function (rule) {
                // Create script to run multiple times if needed
                var script = new vm.Script(rule);

                _.each(params.clients, function (auth, id) {
                    // Update context auth
                    context.auth = auth;

                    // Validate rule against value
                    if (script.runInContext(context)) {
                        clients.push(id);
                    }
                });
            };

            // Test if is there async functions
            var asyncFns = _isAsyncFns(aclRule);

            if (!asyncFns) {
                // If no async function, just resolve and keep processing
                resolveAcl(aclRule);
            } else {
                // Otherwise, resolve asynchronous functions first
                return _resolveAsyncFns(asyncFns, aclRule, context).then(function (staticRule) {
                    // After done resolve 
                    resolveAcl(staticRule);
                });
            }
        }
    }).then(function () {
        return clients;
    });
}

// # Get Attr Logic
function _getAttr(params, attr) {
    // Split attr to append into params
    attr = attr.split('/');

    // Extend params with attr splitted
    params = {
        account: params.account,
        table: attr[0],
        key: attr[1],
        select: attr[2] || false
    };

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

// # Get context to validator's VM {Extend dynamic with static context}
function _getContext(params) {
    return _.extend({
        // # Attr {alias for getAttr}
        attr: function (attr) {
            return _getAttr(params, attr);
        },
        // # Auth
        auth: params.auth || {},
        // # Data
        data: params.data || {}
    }, staticContext);
}

// # Get static context
function _getStaticContext() {
    return {
        // # Schema Validator :boolean
        isBoolean: function (value) {
            return _.isBoolean(value);
        },
        // # Schema Validator :equals
        isEquals: function (value, eqValue) {
            return value === eqValue;
        },
        // # Schema Validator :number
        isNumber: function (value) {
            return _.isNumber(value);
        },
        // # Schema Validator :string
        isString: function (value) {
            return _.isString(value);
        },
        // # Schema Validator :contains
        contains: function (cnValue, value) {
            return _.contains(cnValue, value);
        },
        // # Schema Validator :exists
        exists: function (value) {
            if (_.isObject(value) || _.isArray(value)) {
                return !_.isEmpty(value);
            }

            return !_.isUndefined(value) && !_.isNull(value);
        },
        // # Schema Validator :now
        now: function () {
            return +new Date;
        }
    };
}

// # Seek for async functions
function _isAsyncFns(rule) {
    if (_.isString(rule)) {
        return rule.match(/attr\(['"][^\(\)]+['"]\)/g);
    }

    return false;
}

// # Resolve asynchronous function in a rule
function _resolveAsyncFns(fns, rule, context) {
    // Iterate over all async functions in this rule
    var tasks = _.map(fns, function (fn) {
        // Push them to tasks array to be monitored via Promise.all
        return vm.runInContext(fn, context).then(function (response) {
            // Replace rule with static value
            rule = rule.replace(fn, response);
        });
    });

    return Promise.all(tasks).then(function () {
        return rule;
    });
}