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
    dynamodb.schema.set('tblLive1')
            .withHash('namespace as STRING')
            .withRange('key as STRING')
            .withDefault({createdAt: 'TIMESTAMP'});
}

// # Create Tables
function _createTables() {

    var returnData = [];
    var tables = [];

    // # tblLiveOne
    tables.push(dynamodb.table.create('tblLive1')
            .withHash('namespace as STRING')
            .withRange('key as STRING')
            .withLocalIndex({
                name: 'orderIndex',
                attribute: '_orderIndex as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'numberIndex0',
                attribute: '_ni0 as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'numberIndex1',
                attribute: '_ni1 as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'stringIndex0',
                attribute: '_si0 as STRING',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'stringIndex1',
                attribute: '_si1 as STRING',
                projection: 'ALL'
            })
            .throughput(10, 10));

    // Each executes in series
    return Promise.each(tables, function (task) {
        return task.exec().then(function (result) {
            returnData.push(result);
        });
    }).then(function () {
        return returnData;
    });
}