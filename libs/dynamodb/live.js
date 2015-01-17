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
                get: function () {
                    // Execute get
                    get(params);
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
function _item(params) {
    var query = dynamoGet.item('tblLive1');

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

// # get
function get(params) {
    // Define operation
    if (params.namespace.indexOf('/') >= 0) {
        // Item Operation
        _.extend(params, {
            namespace: params.namespace.split('/')[0],
            key: params.namespace.split('/')[1]
        });

        _item(params);
    } else {
        // Query Operation
        _.extend(params.where, {
            namespace: ['=', params.namespace]
        });

        if (params.index && params.useIndex) {
            // Discover and get Index
            params.indexedBy = _discoverIndex(params.index, params.useIndex);
        }

        _query(params);
    }
}

// # Set
function set(params) {
    // Define namespace
    if (params.namespace.indexOf('/') >= 0) {
        // Custom Key
        _.extend(params.set, {
            namespace: params.namespace.split('/')[0],
            key: params.namespace.split('/')[1]
        });
    } else {
        // Default Key
        _.extend(params.set, {
            namespace: params.namespace
        });
    }

    if (params.index) {
        // Encode Index
        params.set = _encodeIndexSet(params.index, params.set);
    }

    _insert(params);
}

// # Encode Index Set
function _encodeIndexSet(index, set) {
    var result = {};

    // String Index
    if (index.string) {
        _.each(index.string, function (indexAttr, key) {
            result['_si' + (key % 2)] = set[indexAttr]; // key % 2 guarantees 0 or 1
        });
    }

    // Number Index
    if (index.number) {
        _.each(index.number, function (indexAttr, key) {
            result['_ni' + (key % 2)] = set[indexAttr]; // key % 2 guarantees 0 or 1
        });
    }

    return _.extend(set, result);
}

// # Discover Index
function _discoverIndex(index, attr) {
    var result = false;

    // Discover Index
    var string = index.string.indexOf(attr);
    var number = index.number.indexOf(attr);

    if (string >= 0) {
        result = 'stringIndex' + string; // stringIndex0 or stringIndex1
    }

    if (number >= 0) {
        result = 'numberIndex' + number; // numberIndex0 or numberIndex1
    }

    return result;
}

// # Query
function _query(params) {

    var query = dynamoGet.queryItems('tblLive1');

    if (params.alias)
        query.alias({
            names: params.alias.names,
            values: params.alias.values
        });

    if (params.desc)
        query.desc();

    if (params.filter)
        query.withFilter(params.filter);

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

// # Insert
function _insert(params) {
    var insert = dynamoInsert.item('tblLive1');

    if (params.alias)
        insert.alias(params.alias);

    if (params.set)
        insert.set(params.set);

    if (params.withCondition)
        insert.withCondition(params.withCondition);

    insert.exec().then(function (result) {
        io.to(params.namespace).emit('responseSuccess', 'insert', result);
    }).catch(function (err) {
        io.to(params.namespace).emit('responseError', 'insert', err.message);
    });
}