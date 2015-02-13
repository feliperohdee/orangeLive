// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var vm = require('vm');

module.exports = {
    canRead: canRead,
    canWrite: canWrite,
    filterClients: filterClients
};

/*----------------------------*/

// # Can Read
function canRead(params, isCollection) {
    var acl = params.rules.acl;
    var context = vm.createContext(_getContext(params));
    var resultStack = {
        acl: true
    };

    return Promise.try(function () {
        // # Validate ACL's
        if (acl._read) {
            if (isCollection) {
                // Create script to run multiple times
                var script = new vm.Script(acl._read);

                resultStack.acl = !_.every(params.data, function (data) {
                    // Update context data
                    context.data = data;

                    return script.runInContext(context);
                });
            } else {
                resultStack.acl = !vm.runInContext(acl._read, context);
            }
        }
    }).then(function () {
        if (resultStack.acl) {
            // ACL Error
            throw new errors.securityError();
        }

        return true;
    });
}

// # Can Write
function canWrite(params) {
    //
    var acl = params.rules.acl;
    var context = vm.createContext(_getContext(params));
    var schema = _.clone(params.rules.schema);
    var resultStack = {
        acl: true,
        outOfKeys: [],
        outOfRules: []
    };

    return Promise.try(function () {
        // # Validate ACL's
        if (acl._save) {
            resultStack.acl = !vm.runInContext(acl._save, context);
        }
    }).then(function () {
        // # Validate Schema
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;
            var asyncTasks = [];

            // Iterate over data keys to seek for schema rules
            _.chain(context.data).keys().each(function (key) {
                //
                var rule = schema[key];

                // Test schema keys
                if (!acceptOther && !rule) {
                    resultStack.outOfKeys.push(key);
                }

                // test schema rules
                if (rule) {
                    // Test if is there async functions
                    var asyncFns = _isAsyncFns(rule);
                    // Define resolver function
                    var resolveRule = function (rule, context) {
                        if (!vm.runInContext(rule, context)) {
                            resultStack.outOfRules.push(key);
                        }
                    };

                    if (!asyncFns) {
                        // If no async function, just resolve and keep processing
                        resolveRule(rule, context);
                    } else {
                        // Otherwise, create tasks to resolve asynchronous functions first
                        asyncTasks.push(_resolveAsyncFns(rule, asyncFns, context).then(function (rule) {
                            // After done resolve 
                            resolveRule(rule, context);
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

// # Filter Clients {use for socket, no promises for agility}
function filterClients(params) {
    //
    var context = vm.createContext(_getContext(params));
    var script = new vm.Script(params.rules.acl._read);
    var clients = [];

    _.each(params.clients, function (auth, id) {
        // Update context auth
        context.auth = auth;

        // Validate rule against value
        if (script.runInContext(context)) {
            clients.push(id);
        }
    });

    return clients;
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

// # Get context to validator's VM
function _getContext(params) {
    return {
        // # Attr {alias for getAttr}
        attr: function (attr) {
            return _getAttr(params, attr);
        },
        // # Auth
        auth: params.auth || {},
        // # Data
        data: params.data || {},
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
    return rule.match(/(attr)\(["'][a-z0-9A-Z\/]*["']\)/g);
}

// # Resolve asynchronous function in a rule
function _resolveAsyncFns(rule, fns, context) {
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