// # DynamoDb Live
var _ = require('lodash');
var dynamoGet = require('./get');
var dynamoInsert = require('./insert');
var dynamoUpdate = require('./update');

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

            var instance = orangeLive(params, socket);

            if (instance[operation]) {
                instance[operation]();
            }
        });
    });
}

// # Decode Address
function _decodeAddress(address) {
    address = address.split('/');

    return {
        namespace: address[0],
        key: address[1] || false
    };
}

function orangeLive(params, socket) {
    //
    return{
        load: load,
        join: join,
        leave: leave,
        set: set
    };

    /*----------------------------*/

    // # Leave Operation
    function leave() {
        // Leave namespace
        if (params.namespace !== socket.id) {
            socket.leave(params.namespace);
        }
    }

    // # Load Operation
    function load() {
        var response = {};

        _doGet().then(function (result) {
            //
            response.event = 'load';
            response.result = result;
        }).catch(function (err) {
            //
            response.event = 'error';
            response.result = err.message;
        }).finally(function () {
            //
            _response(response.event, response.result);
        });
    }

    // # Join Operation
    function join() {
        // Join new namespace, if not connected yet
        if (!socket.rooms[params.namespace]) {
            socket.join(params.namespace);
        }
    }

    // # Set Operation
    function set() {
        var response = {};

        _doSet().then(function (result) {
            //
            response.event = (result.operation === 'insert') ? 'add' : 'change';
            response.result = result;
        }).catch(function (err) {
            //
            response.event = 'error';
            response.result = err.message;
        }).finally(function () {
            //
            _response(response.event, response.result);
        });
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

    // # Do Get Operation
    function _doGet() {
        // Define operation
        if (params.key) {
            // Item Operation
            var itemAttrs = {
                where: {
                    _namespace: params.namespace,
                    _key: params.key
                }
            };

            return _item(itemAttrs);
        } else {
            // Query Operation
            var queryAttrs = {
                consistent: params.consistent,
                limit: params.limit,
                where: {
                    _namespace: ['=', params.namespace]
                }
            };

            // Set default condition if exists, using key
            if (params.condition) {
                queryAttrs.where._key = params.condition;
            }

            // Indexes
            if (params.index && params.indexes) {
                // Discover and get Index
                var index = _discoverIndex(params.indexes, params.index);

                // Set indexed by
                queryAttrs.indexedBy = index.name;

                // Set condition if exists
                if (params.condition) {
                    // Remove default key condition
                    delete queryAttrs.where._key;
                    // Append indexed condition
                    queryAttrs.where[index.attribute] = params.condition;
                }
            }

            return _query(queryAttrs);
        }
    }

    // # Do Set Operation
    function _doSet() {

        // Encode Indexes
        if (params.indexes) {
            params.set = _encodeIndexSet(params.indexes, params.set);
        }

        // Define namespace
        if (params.key) {
            // ## Update Operation
            var updateAttrs = {
                set: params.set,
                where: {
                    _namespace: params.namespace,
                    _key: params.key
                }
            };

            return _update(updateAttrs);
        } else {
            // ## Insert Operation
            var insertAttrs = {
                set: _.extend({}, params.set, {
                    _namespace: params.namespace
                })
            };

            return _insert(insertAttrs);
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

    // # Item
    function _item(attrs) {
        var item = dynamoGet.item('tblLive1');

        if (attrs.select)
            item.select(attrs.select);

        if (attrs.where)
            item.where(attrs.where);

        return item.exec().then(function (result) {
            // Append operation type
            return _.extend(result, {
                operation: 'item'
            });
        });
    }

    // # Insert
    function _insert() {
        var insert = dynamoInsert.item('tblLive1');

        if (params.set)
            insert.set(params.set);

        return insert.exec().then(function (result) {
            // Append operation type
            return _.extend(result, {
                operation: 'insert'
            });
        });
    }

    // # Query
    function _query(attrs) {
        //
        var query = dynamoGet.queryItems('tblLive1');

        if (attrs.consistent)
            query.consistent();

        if (attrs.desc)
            query.desc();

        if (attrs.indexedBy)
            query.indexedBy(attrs.indexedBy);

        if (attrs.limit)
            query.limit(attrs.limit);

        if (attrs.select)
            query.select(attrs.select);

        if (attrs.startAt)
            query.startAt(attrs.startAt);

        if (attrs.where)
            query.where(attrs.where);

        return query.exec().then(function (result) {
            // Append operation type
            return _.extend(result, {
                operation: 'query'
            });
        });
    }

    function _response(event, result) {
        if (event === 'error') {
            io.to(params.namespace).emit('responseError', result);
        } else {
            io.to(params.namespace).emit('responseSuccess', event, result);
        }
    }

    // # Update
    function _update(params) {
        var update = dynamoUpdate.item('tblLive1');

        if (params.set)
            update.set(params.set);

        if (params.where)
            update.where(params.where);

        return update.exec().then(function (result) {
            // Append operation type
            return _.extend(result, {
                operation: 'update'
            });
        });
    }
}