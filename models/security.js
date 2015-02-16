// # Live Security
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var Evaluator = require('./evaluator');

module.exports = {
    canDel: canDel,
    canRead: canRead,
    canWrite: canWrite,
    filterClients: filterClients
};

/*----------------------------*/

// # Can Del
function canDel(params) {
    var acl = params.rules.acl && params.rules.acl._remove ? params.rules.acl._remove : false;
    var evaluator = new Evaluator(params);

    return Promise.try(function () {
        // # Validate ACL's
        if (acl) {
            return evaluator.parse(acl).then(function (response) {
                if (!response) {
                    // ACL Error
                    throw new errors.securityError();
                }
            });
        }
    });
}

// # Can Read
function canRead(params, isCollection) {
    var acl = params.rules.acl && params.rules.acl._read ? params.rules.acl._read : false;
    var evaluator = new Evaluator(params);

    return Promise.try(function () {
        // # Validate ACL's
        if (acl && isCollection) {
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
        } else if (acl) {
            return evaluator.parse(acl).then(function (response) {
                if (!response) {
                    // ACL Error
                    throw new errors.securityError();
                }
            });
        }
    });
}

// # Can Write
function canWrite(params) {
    //
    var acl = params.rules.acl && params.rules.acl._save ? params.rules.acl._save : false;
    var schema = params.rules.schema;
    var evaluator = new Evaluator(params);

    return Promise.try(function () {
        // # Validate ACL's
        if (acl) {
            return evaluator.parse(acl).then(function (response) {
                if (!response) {
                    // ACL Error
                    throw new errors.securityError();
                }
            });
        }
    }).then(function () {
        // # Validate Schema
        if (schema) {
            var acceptOther = _.isBoolean(schema._other) ? schema._other : true;

            // Iterate over data keys to seek for schema rules
            return Promise.each(_.keys(params.data), function (key) {
                //
                var schemaRule = schema[key];

                // Test schema keys
                if (!acceptOther && !schemaRule) {
                    // Schema Keys Error
                    throw new errors.schemaKeysError({
                        explanation: 'The provided key "' + key + '" is out of schema keys.'
                    });
                }

                // Test schema rules
                if (schemaRule) {
                    return evaluator.parse(schemaRule).then(function (response) {
                        if (!response) {
                            // Schema Rules Error
                            throw new errors.schemaRulesError({
                                explanation: 'The provided value "' + key + '" is out of schema rules.'
                            });
                        }
                    });
                }
            });
        }
    });
}

// # Filter Clients {use for socket}
function filterClients(params) {
    //
    var acl = params.rules.acl && params.rules.acl._read ? params.rules.acl._read : false;
    var evaluator = new Evaluator(params);
    var authorizedClients = [];

    return Promise.try(function(){
        // Get client id's
        return _.keys(params.clients);
    }).each(function (id) {
        // # Validate ACL's
        if (acl) {
            // Update evaluator auth
            evaluator.updateAuth(params.clients[id]);

            return evaluator.parse(acl).then(function (response) {
                if (response) {
                    // Push authorized clients
                    authorizedClients.push(id);
                }
            });
        }
    }).then(function () {
        return authorizedClients;
    });
}