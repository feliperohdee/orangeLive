// AWS Dynamodb => Get
var helpers = require('./helpers');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = {
    item: item,
    queryItems: queryItems,
    scanItems: scanItems
};

/* ======================================================================== */



/**
 * Item {getItem}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      select()
 *      where()
 *      consistent()
 *      exec()
 * }
 */
function item(table) {
    //
    var params = {};
    var returnData = {
        data: {}
    };

    _setTable(table);

    return {
        alias: alias,
        consistent: consistent,
        exec: exec,
        select: select,
        where: where
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }
    
    // # Attributes Alias
    function alias(alias) {
        // ## ExpressionAttributeNames
        if (alias.names) {
            params.ExpressionAttributeNames = helpers.alias.encodeAttributes.names(alias.names);
        }

        // ## ExpressionAttributeValues
        if (alias.values) {
            params.ExpressionAttributeValues = helpers.alias.encodeAttributes.values(alias.values);
        }

        return this;
    }

    // # ConsistentRead
    function consistent() {
        params.ConsistentRead = true;
        return this;
    }

    // # exec
    function exec() {
        return new Promise(function (resolve, reject) {
            dynamodbInstance.getItem(params, function (err, result) {
                if (err) {
                    reject(err);
                }

                if (!_.isEmpty(result) && !_.isEmpty(result.Item)) {
                    //Format data
                    returnData.data = helpers.item.decodeAttributes(result.Item);
                }

                resolve(returnData);
            });
        });
    }

    // # ProjectionExpression (old AttributesToGet)
    function select(select) {
        params.ProjectionExpression = select;
        return this;
    }

    // # KeyConditions
    function where(where) {
        params.Key = helpers.item.encodeAttributes(where);
        return this;
    }
}

/**
 * Query Items {Query}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      alias()
 *      desc()
 *      consistent()
 *      exec()
 *      indexedBy()
 *      limit()
 *      select()
 *      startAt()
 *      where()
 *      withFilter()
 * }
 */
function queryItems(table) {
    //
    var params = {};
    var returnData = {
        data: [],
        count: 0,
        startKey: null
    };

    _setTable(table);

    return {
        alias: alias,
        desc: desc,
        consistent: consistent,
        exec: exec,
        indexedBy: indexedBy,
        limit: limit,
        select: select,
        startAt: startAt,
        where: where,
        withFilter: withFilter
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Attributes Alias
    function alias(alias) {
        // ## ExpressionAttributeNames
        if (alias.names) {
            params.ExpressionAttributeNames = helpers.alias.encodeAttributes.names(alias.names);
        }

        // ## ExpressionAttributeValues
        if (alias.values) {
            params.ExpressionAttributeValues = helpers.alias.encodeAttributes.values(alias.values);
        }

        return this;
    }

    // # ScanIndexForward
    function desc() {
        params.ScanIndexForward = false;
        return this;
    }

    // # ConsistentRead
    function consistent() {
        params.ConsistentRead = true;
        return this;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            // Define query function, a way to call recursively after words
            var queryFn = function () {
                dynamodbInstance.query(params, function (err, result) {
                    // Throw error
                    if (err) {
                        reject(err);
                    }

                    //Format Data
                    if (!_.isEmpty(result)) {
                        // Feed returnData
                        if (!_.isEmpty(result.Items)) {
                            returnData.data.push.apply(returnData.data, helpers.items.decodeAttributes(result.Items));
                        }

                        if (result.LastEvaluatedKey) {
                            returnData.startKey = helpers.item.decodeAttributes(result.LastEvaluatedKey);
                        }

                        if (result.Count) {
                            returnData.count += result.Count;
                        }

                        // If not limit, call queryFn recursively with ExclusiveStartKey apended via LastEvaluatedKey
                        if (!params.Limit && result.LastEvaluatedKey) {
                            params.ExclusiveStartKey = result.LastEvaluatedKey;
                            //Recursion
                            return queryFn();
                        }
                    }

                    //If no more items left, resolve returnData
                    resolve(returnData);
                });
            };

            //Call query function first time
            queryFn();
        });
    }

    // # IndexName
    function indexedBy(index) {
        params.IndexName = index;
        return this;
    }

    // # Limit
    function limit(limit) {
        params.Limit = parseInt(limit);
        return this;
    }

    // # ProjectionExpression (old AttributesToGet)
    function select(select) {
        if (select === 'COUNT') {
            params.Select = 'COUNT';
            return this;
        }

        params.ProjectionExpression = select;
        return this;
    }

    // # ExclusiveStartKey
    function startAt(startAt) {
        params.ExclusiveStartKey = helpers.item.encodeAttributes(startAt);
        return this;
    }

    // # KeyConditions
    function where(where) {
        params.KeyConditions = helpers.items.encodeAttributes(where);
        return this;
    }

    // # FilterExpression (old QueryFilter && ConditionalOperator)
    function withFilter(withFilter) {
        params.FilterExpression = withFilter;
        return this;
    }
}

/**
 * Scan Items {Scan}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      alias()
 *      exec()
 *      limit()
 *      parallel()
 *      select()
 *      startAt()
 *      withFilter()
 * }
 */
function scanItems(table) {
    //
    var params = {};
    var returnData = {
        data: [],
        count: 0,
        startKey: null
    };

    _setTable(table);

    return {
        alias: alias,
        exec: exec,
        limit: limit,
        parallel: parallel,
        select: select,
        startAt: startAt,
        withFilter: withFilter
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Attributes Alias
    function alias(alias) {
        // ## ExpressionAttributeNames
        if (alias.names) {
            params.ExpressionAttributeNames = helpers.alias.encodeAttributes.names(alias.names);
        }

        // ## ExpressionAttributeValues
        if (alias.values) {
            params.ExpressionAttributeValues = helpers.alias.encodeAttributes.values(alias.values);
        }

        return this;
    }

    // # Exec
    function exec() {
        return new Promise(function (resolve, reject) {
            // Define scan function, a way to call recursively after words
            var scanFn = function () {
                dynamodbInstance.scan(params, function (err, result) {
                    // Throw error
                    if (err) {
                        reject(err);
                    }

                    //Format Data
                    if (!_.isEmpty(result)) {
                        // Feed returnData
                        if (!_.isEmpty(result.Items)) {
                            returnData.data.push.apply(returnData.data, helpers.items.decodeAttributes(result.Items));
                        }

                        if (result.LastEvaluatedKey) {
                            returnData.startKey = helpers.item.decodeAttributes(result.LastEvaluatedKey);
                        }

                        if (result.Count) {
                            returnData.count += result.Count;
                        }

                        // If not limit, call queryFn recursively with ExclusiveStartKey apended via LastEvaluatedKey
                        if (!params.Limit && result.LastEvaluatedKey) {
                            params.ExclusiveStartKey = result.LastEvaluatedKey;
                            //Recursion
                            return scanFn();
                        }
                    }

                    //If no more items left, resolve returnData
                    resolve(returnData);
                });
            };

            //Call scan function first time
            scanFn();
        });
    }

    // # Limit
    function limit(limit) {
        params.Limit = limit;
        return this;
    }

    // # Segment && Segments
    function parallel(segment, segments) {
        params.Segment = segment;
        params.Segments = segments;
        return this;
    }

    // # ProjectionExpression (old AttributesToGet)
    function select(select) {
        if (select === 'COUNT') {
            params.Select = 'COUNT';
            return this;
        }

        params.ProjectionExpression = select;
        return this;
    }

    // # ExclusiveStartKey
    function startAt(startAt) {
        params.ExclusiveStartKey = helpers.item.encodeAttributes(startAt);
        return this;
    }

    // # FilterExpression (old QueryFilter && ConditionalOperator)
    function withFilter(withFilter) {
        params.FilterExpression = withFilter;
        return this;
    }
}