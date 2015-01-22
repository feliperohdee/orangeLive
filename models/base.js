// # Base Model
var Promise = require('bluebird');
var dynamodb = require('../libs').dynamodb;

_createTables();
_createSchema();

module.exports = {
    insert: insert,
    item: item,
    query: query,
    update: update
};

/*=======================================*/

// # Create Schema
function _createSchema() {
    // # Set schema for tblLiveOne
    dynamodb.schema.set('tblLive1')
            .withHash('_namespace as STRING')
            .withRange('_key as STRING');
}

// # Create Tables
function _createTables() {

    var returnData = [];
    var tables = [];

    // # tblLiveOne
    tables.push(dynamodb.table.create('tblLive1')
            .withHash('_namespace as STRING')
            .withRange('_key as STRING')
            .withLocalIndex({
                name: 'priorityIndex',
                attribute: '_pi as NUMBER',
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

// # Insert
function insert(params) {

    var insert = dynamodb.insert.item('tblLive1');

    if (params.alias)
        insert.alias(params.alias);

    if (params.set)
        insert.set(params.set);

    if (params.withCondition)
        insert.withCondition(params.withCondition);

    return insert.exec();
}

// # Item
function item(params) {
    var item = dynamodb.get.item('tblLive1');

    if (params.alias)
        item.alias(params.alias);

    if (params.select)
        item.select(params.select);

    if (params.where)
        item.where(params.where);

    return item.exec();
}

// # Query
function query(params) {
    //
    var query = dynamodb.get.queryItems('tblLive1');

    if (params.alias)
        query.alias(params.alias);

    if (params.consistent)
        query.consistent();

    if (params.desc)
        query.desc();

    if (params.indexedBy)
        query.indexedBy(params.indexedBy);

    if (params.limit)
        query.limit(params.limit);

    if (params.select)
        query.select(params.select);

    if (params.startAt)
        query.startAt(params.startAt);

    if (params.where)
        query.where(params.where);

    return query.exec();
}

// # Update
function update(params) {

    var update = dynamodb.update.item('tblLive1');

    if (params.alias)
        update.alias(params.alias);

    if (params.set)
        update.set(params.set);

    if (params.where)
        update.where(params.where);

    return update.exec();
}