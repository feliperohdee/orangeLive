// AWS Dynamodb => Update
var helpers = require('./helpers');
var dynamoSchema = require('./schema');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = {
    item: item
};

/* ======================================================================== */

/**
 * Item {updateItem}
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      alias()
 *      exec()
 *      where()
 *      withCondition()
 *      set()
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
        where: where,
        withCondition: withCondition
    };

    /*---------------------------------------*/

    // # Set Return Data
    function _setReturnData(data) {
        _.extend(returnData, data);
    }

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
            dynamodbInstance.updateItem(params, function (err, response) {
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

    // # AttributeUpdates || UpdateExpression
    function set(data) {
        //
        if (typeof data === 'string') {
            // Set expression
            params.UpdateExpression = data;
            return this;
        }

        var validatedData = dynamoSchema.validateUpdateData(table, data);

        // Set Return Data => New Object Data
        _setReturnData(validatedData);

        params.AttributeUpdates = helpers.update.encodeAttributes(validatedData);
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

    // # ConditionExpression (old ConditionalOperator && Expected)
    function withCondition(withCondition) {
        params.ConditionExpression = withCondition;
        return this;
    }
}