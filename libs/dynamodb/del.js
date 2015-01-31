// AWS Dynamodb => Delete
var helpers = require('./helpers');
var dynamoSchema = require('./schema');
var Promise = require('bluebird');
var _ = require('lodash');
var dynamoGet = require('./get');

module.exports = {
    item: item,
    items: items,
    itemsByQuery: itemsByQuery
};

/* ======================================================================== */

/**
 * Item {DeleteItem}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      alias()
 *      exec()
 *      withCondition()
 *      where()
 * }
 */
function item(table) {
    //
    var params = {};
    var returnData = {};

    _setTable(table);

    return {
        alias: alias,
        exec: exec,
        withCondition: withCondition,
        where: where
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Set Return Data
    function _setReturnData(data) {
        returnData = data;
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
            dynamodbInstance.deleteItem(params, function (err, response) {
                if (err) {
                    reject(err);
                }

                resolve({
                    data: returnData,
                    response: response
                });
            });
        });
    }

    // # ConditionExpression (old ConditionalOperator && Expected)
    function withCondition(withCondition) {
        params.ConditionExpression = withCondition;
        return this;
    }

    // # Where
    function where(where) {
        var validatedData = dynamoSchema.validateAbsoluteWhere(table, where);

        // Set Return Data => Object Keys
        _setReturnData(validatedData);

        params.Key = helpers.item.encodeAttributes(validatedData);
        return this;
    }
}

/**
 * Items {BatchWriteItem > Delete}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      exec()
 *      where()
 * }
 */
function items(table) {
    //
    var paramsArray = [];
    var returnData = [];

    return {
        exec: exec,
        where: where
    };

    /*---------------------------------------*/

    // # Set Return Data
    function _setReturnData(data) {
        returnData.push(data);
    }

    // # Exec
    function exec() {
        var requests = [];

        //Define Batch Function
        var _batchFn = function (params) {
            return new Promise(function (resolve, reject) {
                dynamodbInstance.batchWriteItem(params, function (err, response) {
                    if (err) {
                        reject(err);
                    }

                    resolve(response);
                });
            });
        };

        // Define requests with divided parameters
        _.each(paramsArray, function (params) {
            requests.push(_batchFn(params));
        });

        return Promise.all(requests).then(function (response) {
            return {
                data: returnData,
                response: response
            };
        });
    }

    // # Request Items
    function where(attr) {
        var paramsIndex = -1;

        _.each(attr, function (value, index) {
            // This job is divided into 25 requests each one, its dynamo rule
            if (index % 25 === 0) {
                paramsIndex++;
                paramsArray[paramsIndex] = {};
                paramsArray[paramsIndex].RequestItems = {};
                paramsArray[paramsIndex].RequestItems[table] = [];
            }

            var validatedData = dynamoSchema.validateAbsoluteWhere(table, value);

            // Set Return Data => Object Keys
            _setReturnData(validatedData);

            // Format Items and append to paramsArray, each index with 25 requests
            paramsArray[paramsIndex].RequestItems[table].push({
                DeleteRequest: {
                    Key: helpers.item.encodeAttributes(validatedData)
                }
            });
        });

        return this;
    }
}

/**
 * Items by Query
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      exec()
 *      where()
 * }
 */
function itemsByQuery(table) {
    //
    var params = {};

    _setTable(table);

    return {
        exec: exec,
        where: where
    };

    /*---------------------------------------*/

    // # TableName
    function _setTable(table) {
        params.TableName = table;
    }

    // # Exec
    function exec() {
        return dynamoGet.queryItems(params.TableName)
                .where(params.Where)
                .exec()
                .then(function (response) {
                    return items(params.TableName)
                            .where(response.data)
                            .exec();
                });
    }

    // # Where
    function where(where) {
        params.Where = where;
        return this;
    }
}