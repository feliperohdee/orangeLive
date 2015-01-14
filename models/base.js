// # Base Model
var Promise = require('bluebird');
var dynamodb = require('../libs').dynamodb;

_createTables();
_createSchema();

module.exports = dynamodb;

/*=======================================*/

// # Create Schema
function _createSchema() {
    // # Set schema for tblLiveOne
    dynamodb.schema.set('tblLiveOne')
            .withHash('namespace as STRING')
            .withRange('key as STRING')
            .withDefault({createdAt: 'TIMESTAMP'});
}

// # Create Tables
function _createTables() {

    var returnData = [];

    // # tblLiveOne
    var tblLiveOne = dynamodb.table.create('tblLiveOne')
            .withHash('namespace as STRING')
            .withRange('key as STRING')
            .withLocalIndex({
                name: 'indexOne',
                attribute: '_indexOne as STRING',
                projection: 'KEYS_ONLY'
            })
            .withLocalIndex({
                name: 'indexOrder',
                attribute: '_indexOrder as NUMBER',
                projection: 'KEYS_ONLY'
            })
            .throughput(10, 10);


    // Each executes in series
    return Promise.each([
        tblLiveOne
    ], function (task) {
        return task.exec().then(function (result) {
            returnData.push(result);
        });
    }).then(function () {
        return returnData;
    });
}