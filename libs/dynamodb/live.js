// # DynamoDb Live
var _ = require('lodash');
var dynamoGet = require('./get');
var dynamoInsert = require('./insert');
var md5 = require('MD5');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        // # Request
        socket.on('request', function (operation, params) {
            //
            var operationFactory = {
                join: function () {
                    //Join client to namespace
                    _joinRoom(socket, params);
                },
                leave: function () {
                    //Leave client from namespace
                    _leaveRoom(socket, params);
                },
                query: function () {
                    // Execute query
                    query(params);
                },
                item: function () {
                    // Execute get
                    item(params);
                },
                set: function () {
                    // Execute set
                    set(params);
                }
            };
            
            // Exec operation
            operationFactory[operation]();
        });
    });
}

// # Join Room
function _joinRoom(socket, params) {
    // Join new namespace, if not connected yet
    if (!socket.rooms[params.namespace]) {
        socket.join(params.namespace);
    }
}

// # Leave Room
function _leaveRoom(socket, params) {
    // Leave namespace
    if (params.namespace !== socket.id) {
        socket.leave(params.namespace);
    }
}

// # Item
function item(params) {
    var query = dynamoGet.item('tblLiveOne');

    if (params.select)
        query.select(params.select);

    if (params.where)
        query.where(params.where);

    query.exec().then(function (result) {
        io.to(params.namespace).emit('responseSuccess', 'item', result);
    }).catch(function (err) {
        io.to(params.namespace).emit('responseError', 'item', err.message);
    });
}

// # Query
function query(params) {
    var query = dynamoGet.queryItems('tblLiveOne');

    if (params.asc)
        query.asc(params.asc);

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

    query.exec().then(function (result) {
        io.to(params.namespace).emit('responseSuccess', 'query', result);
    }).catch(function (err) {
        io.to(params.namespace).emit('responseError', 'query', err.message);
    });
}

// # Set
function set(params) {
    var set = dynamoInsert.item('tblLiveOne');

    if (params.alias)
        set.alias(params.alias);

    if (params.set)
        set.set(params.set);

    if (params.withCondition)
        set.withCondition(params.withCondition);

    set.exec().then(function (result) {
        io.to(params.namespace).emit('responseSuccess', 'set', result);
    }).catch(function (err) {
        io.to(params.namespace).emit('responseError', 'set', err.message);
    });
}