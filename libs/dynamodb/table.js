// AWS Dynamodb => Table
var helpers = require('./helpers');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = {
    create: create,
    del: del,
    describe: describe,
    list: list,
    update: update
};

/* ======================================================================== */

/**
 * Create {createTable}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      exec()
 *      withGlobalIndex()
 *      withHash()
 *      withLocalIndex()
 *      withRange()
 *      throughput()
 * }
 */
function create(table) {
    var params = {};

    // Required Keys
    params.AttributeDefinitions = [];
    params.KeySchema = [];
    params.ProvisionedThroughput = {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
    };

    _setTable(table);

    return {
        exec: exec,
        withGlobalIndex: withGlobalIndex,
        withHash: withHash,
        withLocalIndex: withLocalIndex,
        withRange: withRange,
        throughput: throughput
    };

    /*---------------------------------------*/

    // # Add AttributeDefinitions
    function _addAttributeDefinitions(attribute) {
        //
        params.AttributeDefinitions.push({
            AttributeName: attribute.name,
            AttributeType: attribute.type
        });

        //Remove Duplicates
        params.AttributeDefinitions = _.uniq(params.AttributeDefinitions, 'AttributeName');
    }
    
    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            // test if table exists
            describe(table).exec()
                    .then(function (response) {
                        // Table exists
                        resolve(response);
                    })
                    .catch(function () {
                        // Table not exists
                        dynamodbInstance.createTable(params, function (err, response) {
                            if (err) {
                                reject(err);
                            }

                            resolve(response);
                        });
                    });
        });
    }

    // # GlobalSecondaryIndexes
    function withGlobalIndex(index) {
        //Define array, id doesn't exists
        if (!_.isArray(params.GlobalSecondaryIndexes)) {
            params.GlobalSecondaryIndexes = [];
        }

        // Set AttributeDefinitions => HASH
        var hash = helpers.schema.encodeAttribute(index.attributes[0]);
        _addAttributeDefinitions(hash);

        // Set AttributeDefinitions => RANGE
        var range = helpers.schema.encodeAttribute(index.attributes[1]);
        _addAttributeDefinitions(range);

        // Index
        params.GlobalSecondaryIndexes.push({
            IndexName: index.name || (hash.name + _.capitalize(range.name)),
            KeySchema: [{
                    AttributeName: hash.name,
                    KeyType: 'HASH'
                }, {
                    AttributeName: range.name,
                    KeyType: 'RANGE'
                }],
            Projection: {
                ProjectionType: (index.projection && ['ALL', 'KEYS_ONLY'].indexOf(index.projection) > 0) ? index.projection : 'ALL'
            },
            ProvisionedThroughput: params.ProvisionedThroughput // Same ProvisionedThroughput
        });

        return this;
    }

    // # KeySchema => HASH
    function withHash(hash) {
        var attribute = helpers.schema.encodeAttribute(hash);

        // Set AttributeDefinitions
        _addAttributeDefinitions(attribute);

        // Set KeySchema
        params.KeySchema.push({
            AttributeName: attribute.name,
            KeyType: 'HASH'
        });

        return this;
    }

    // # LocalSecondaryIndexes
    function withLocalIndex(index) {
        //Define array, id doesn't exists
        if (!_.isArray(params.LocalSecondaryIndexes)) {
            params.LocalSecondaryIndexes = [];
        }

        // Set AttributeDefinitions => RANGE
        var range = helpers.schema.encodeAttribute(index.attribute);
        _addAttributeDefinitions(range);

        // Index
        params.LocalSecondaryIndexes.push({
            IndexName: index.name || (_.find(params.KeySchema, {KeyType: 'HASH'}).AttributeName + _.capitalize(range.name)),
            KeySchema: [{
                    //Get AttributeName from KeySchema => Local index hash needs to be the same KeySchema's hash
                    AttributeName: _.find(params.KeySchema, {KeyType: 'HASH'}).AttributeName,
                    KeyType: 'HASH'
                }, {
                    AttributeName: range.name,
                    KeyType: 'RANGE'
                }],
            Projection: {
                ProjectionType: (index.projection && ['ALL', 'KEYS_ONLY'].indexOf(index.projection) > 0) ? index.projection : 'ALL'
            }
        });

        return this;
    }

    // # KeySchema => RANGE
    function withRange(range) {
        var attribute = helpers.schema.encodeAttribute(range);

        // Set AttributeDefinitions
        _addAttributeDefinitions(attribute);

        // Set KeySchema
        params.KeySchema.push({
            AttributeName: attribute.name,
            KeyType: 'RANGE'
        });

        return this;
    }

    // # ProvisionedThroughput
    function throughput(read, write) {
        params.ProvisionedThroughput = {
            ReadCapacityUnits: read || 5,
            WriteCapacityUnits: write || 5
        };

        return this;
    }
}

/**
 * Del {deleteTable}
 * 
 * @param {string} table
 * @methods {
 *      exec()
 * }
 */
function del(table) {
    var params = {};

    _setTable(table);

    return {
        exec: exec
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            dynamodbInstance.deleteTable(params, function (err, response) {
                if (err) {
                    reject(err);
                }

                resolve(response);
            });
        });
    }
}

/**
 * Describe {describeTable}
 * 
 * @param {string} table
 * @methods {
 *      exec()
 * }
 */
function describe(table) {
    var params = {};

    _setTable(table);

    return {
        exec: exec
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            dynamodbInstance.describeTable(params, function (err, response) {
                if (err) {
                    reject(err);
                }

                resolve(response);
            });
        });
    }
}

/**
 * List {listTables}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      exec()
 *      limit()
 * }
 */
function list(table) {
    var params = {};

    _setTable(table);

    return {
        exec: exec,
        limit: limit
    };

    /*---------------------------------------*/

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            dynamodbInstance.listTables(params, function (err, response) {
                if (err) {
                    reject(err);
                }

                resolve(response);
            });
        });
    }

    // # Limit
    function limit(limit) {
        params.Limit = parseInt(limit);
        return this;
    }


}

/**
 * Update {updateTable}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      throughput()
 *      exec()
 * }
 */
function update(table) {
    var params = {};

    _setTable(table);

    return {
        exec: exec,
        throughput: throughput
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            dynamodbInstance.updateTable(params, function (err, response) {
                if (err) {
                    reject(err);
                }

                resolve(response);
            });
        });
    }

    // # ProvisionedThroughput
    function throughput(read, write) {
        params.ProvisionedThroughput = {
            ReadCapacityUnits: read || 5,
            WriteCapacityUnits: write || 5
        };

        return this;
    }
}