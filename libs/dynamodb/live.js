// # DynamoDb Live
var _ = require('lodash');
var dynamoGet = require('./get');
var dynamoInsert = require('./insert');
var dynamoUpdate = require('./update');
var md5 = require('MD5');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        // # Request
        socket.on('request', function (operation, params) {
            // Decode Address
            var address = _decodeAddress(params.address);
            
            // Append these keys to params
            params.namespace = address.namespace;
            params.key = address.key;
            
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

// # Decode Address
function _decodeAddress(address){
    address = address.split('/');
    
    return {
        namespace: address[0],
        key: address[1] || false
    };
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
    //
    params.where = {};

    // Define operation
    if (params.key) {

        // Item Operation
        params.where._namespace = params.namespace;
        params.where._key = params.key;

        _item(params);
    } else {
        // Query Operation
        params.where._namespace = ['=', params.namespace];

        // Set default condition if exists, using key
        if (params.condition) {
            params.where._key = params.condition;
        }

        // Indexes
        if (params.index && params.indexes) {
            // Remove default key condition
            delete params.where._key;

            // Discover and get Index
            var index = _discoverIndex(params.indexes, params.index);

            // Set indexed by
            params.indexedBy = index.name;

            // Set condition if exists
            if (params.condition) {
                params.where[index.attribute] = params.condition;
            }
        }

        _query(params);
    }
}

// # Set
function set(params) {

    // Encode Indexes
    if (params.indexes) {
        params.set = _encodeIndexSet(params.indexes, params.set);
    }

    // Define namespace
    if (params.key) {
        // ## Update Operation
        params.where = {};
        params.where._namespace = params.namespace;
        params.where._key = params.key;
        
        _update(params);
    } else {
        // ## Insert Operation
        params.set._namespace = params.namespace;
        
        _insert(params);
    }
}

// # Encode Index Set
function _encodeIndexSet(indexes, set) {
    var result = {};

    // String Index
    if (indexes.string) {
        _.each(indexes.string, function (indexAttr, key) {
            result['_si' + (key % 2)] = set[indexAttr]; // key % 2 guarantees 0 or 1
        });
    }

    // Number Index
    if (indexes.number) {
        _.each(indexes.number, function (indexAttr, key) {
            result['_ni' + (key % 2)] = set[indexAttr]; // key % 2 guarantees 0 or 1
        });
    }

    return _.extend(set, result);
}

// # Discover Index
function _discoverIndex(indexes, index) {
    var result = false;

    // Discover Index
    var string = indexes.string.indexOf(index);
    var number = indexes.number.indexOf(index);

    if (string >= 0) {
        result = {
            name: 'stringIndex' + string, // stringIndex0 or stringIndex1
            attribute: '_si' + string // _si0 or _si0
        };
    }

    if (number >= 0) {
        result = {
            name: 'numberIndex' + number, // numberIndex0 or numberIndex1
            attribute: '_ni' + number // _ni0 or _ni0
        };
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

// # Update
function _update(params) {
    var update = dynamoUpdate.item('tblLive1');

    if (params.set)
        update.set(params.set);

    if (params.where)
        update.where(params.where);

    update.exec().then(function (result) {
        io.to(params.namespace).emit('responseSuccess', 'update', result);
    }).catch(function (err) {
        io.to(params.namespace).emit('responseError', 'update', err.message);
    });
}