// AWS Dynamodb => Insert
var helpers = require('./helpers');
var dynamoSchema = require('./schema');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = {
    item: item,
    items: items
};

/* ======================================================================== */

/**
 * Item {putItem}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      alias()
 *      exec()
 *      set()
 *      withCondition()
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
        set: set,
        withCondition: withCondition
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
            dynamodbInstance.putItem(params, function (err, response) {
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

    // # Item
    function set(data) {
        var validatedData = dynamoSchema.validatePutData(table, data);

        // Set Return Data => Object Data
        _setReturnData(validatedData);

        params.Item = helpers.item.encodeAttributes(validatedData);
        return this;
    }

    // # ConditionExpression
    function withCondition(withCondition) {
        params.ConditionExpression = withCondition;
        return this;
    }
}

/**
 * Items {BatchWriteItem > Put}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      exec()
 *      set()
 * }
 */
function items(table) {
    //
    var paramsArray = [];
    var returnData = [];

    return {
        exec: exec,
        set: set
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

    // # Request Set
    function set(data) {
        var paramsIndex = -1;

        _.each(data, function (value, index) {
            // This job is divided into 25 requests each one, its dynamo rule
            if (index % 25 === 0) {
                paramsIndex++;
                paramsArray[paramsIndex] = {};
                paramsArray[paramsIndex].RequestItems = {};
                paramsArray[paramsIndex].RequestItems[table] = [];
            }

            var validatedData = dynamoSchema.validatePutData(table, value);

            // Set Return Data => Object Data
            _setReturnData(validatedData);

            // Format Items and append to paramsArray, each index with 25 requests
            paramsArray[paramsIndex].RequestItems[table].push({
                PutRequest: {
                    Item: helpers.item.encodeAttributes(validatedData)
                }
            });
        });

        return this;
    }
}