// # DynamoDb Live
var _ = require('lodash');
var Promise = require('bluebird');
var dynamoGet = require('./get');
var dynamoInsert = require('./insert');
var dynamoUpdate = require('./update');
var cuid = new require('cuid');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        // # Request
        socket.on('request', function (operation, params) {
            var instance = orangeLive(params, socket);

            if (instance[operation]) {
                instance[operation]();
            }
        });
    });
}

// # Orange Live
function orangeLive(params, socket) {
    //
    return{
        atomicUpdate: atomicUpdate,
        insert: insert,
        item: item,
        join: join,
        leave: leave,
        query: query,
        update: update
    };

    /*----------------------------*/

    // # Atomic Update
    function atomicUpdate() {
        //
        var updateAttrs = {};

        Promise.try(function () {
            // Build Alias
            var alias = _buildAlias(params.set.attribute, params.set.value);
            
            if(!alias){
                throw new Error('Invalid attribute or value.');
            }

            updateAttrs = {
                alias: alias.data,
                set: 'SET ' + alias.map.names[0] + ' = ' + alias.map.names[0] + ' + ' + alias.map.values[0],
                where: {
                    _namespace: params.namespace,
                    _key: params.where
                }
            };

            // Do update sync and response status
            return _syncUpdate(updateAttrs);
        }).then(function (result) {
            _response().me().operation('syncSuccess:atomicUpdate').data(result);
        }).catch(function (err) {
            _response().me().operation('syncError:atomicUpdate').error(err);
        });
    }

    // # Item Operation
    function item() {
        // Execute Operation
        _item().then(function (result) {
            //
            // Normalize data
            result.data = _normalizeReponseData(result.data);

            _response().me().operation('item').data(result);
        }).catch(function (err) {
            //
            _response().me().operation('syncError:item').error(err);
        });
    }

    // ## Insert Operation
    function insert() {

        // Encode Indexes
        if (params.indexes) {
            params.set = _encodeIndexSet(params.indexes, params.set);
        }

        var insertAttrs = {
            set: _.extend(params.set, {
                _namespace: params.namespace,
                _key: params.set.key || '-' + cuid(), // Generate new key if no one provided
                _pi: params.priority || 0 // Priority Index
            })
        };

        // Immediate response
        _response().all().operation('insert').data(_normalizeReponseData(insertAttrs.set));

        // Do insert sync and response status
        return _syncInsert(insertAttrs).then(function () {
            _response().me().operation('syncSuccess:insert');
        }).catch(function (err) {
            _response().me().operation('syncError:insert').error(err);
        });
    }

    // # Join Operation
    function join() {
        // Join new namespace, if not connected yet
        if (!socket.rooms[params.namespace]) {
            socket.join(params.namespace);
        }
    }

    // # Leave Operation
    function leave() {
        // Leave namespace
        if (params.namespace !== socket.id) {
            socket.leave(params.namespace);
        }
    }

    // # Push Attribute Operation
    function pushAtribute() {
        //
        var params = {
            where: ['array'],
            set: {a: 'b'}
        };

        var updateAttrs = {};

        // Create an alias
        updateAttrs.alias = _buildAlias(params.where);
        updateAttrs.set = 'SET #' + params.where + ' list_append(#' + params.where + ', ' + params.set + ')';

        console.log(JSON.stringify(updateAttrs));


        //return _syncUpdate(updateAttrs);

        /*
         setTimeout(function () {
         _syncUpdate({
         where: {
         _namespace: '*',
         _key: '-ci547pll0000062nr1va9ndcy'
         },
         alias: {
         names: {
         array: 'array'
         },
         values: {
         1: -10
         }
         },
         set: 'SET #array = #array + :1'
         }).then(function (r) {
         console.log(r);
         }).catch(function (r) {
         console.log(r.message);
         });
         }, 500);
         */
    }

    // # Query Operation
    function query() {
        // Define query or item operation

        // Execute Operation
        _query().then(function (result) {
            //
            // Normalize data
            result.data = _.map(result.data, function (data) {
                return _normalizeReponseData(data);
            });

            _response().me().operation('query').data(result);
        }).catch(function (err) {
            //
            _response().me().operation('syncError:query').error(err);
        });
    }

    // ## Update Operation
    function update() {

        if (!params.where) {
            _response().me().operation('validationError').error(new Error('No valid keys provided. Please specify primary key field.'));
            return;
        }

        // Encode Indexes
        if (params.indexes) {
            params.set = _encodeIndexSet(params.indexes, params.set);
        }

        // Append priority if exists
        if (params.priority) {
            params.set._pi = params.priority;
        }

        // ## Update Operation
        var updateAttrs = {
            set: params.set,
            where: {
                _namespace: params.namespace,
                _key: params.where
            }
        };

        // Immediate response
        _response().all().operation('update').data(_normalizeReponseData(_.extend(updateAttrs.set, updateAttrs.where)));

        // Do update sync and response status
        return _syncUpdate(updateAttrs).then(function () {
            _response().me().operation('syncSuccess:update');
        }).catch(function (err) {
            _response().me().operation('syncError:update').error(err);
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
                attribute: '_si' + string // _si0 or _si1
            };
        }

        if (number >= 0) {
            result = {
                name: 'numberIndex' + number, // numberIndex0 or numberIndex1
                attribute: '_ni' + number // _ni0 or _ni1
            };
        }

        return result;
    }

    // # Encode Index Set
    function _encodeIndexSet(indexes, set) {
        var result = {};

        // String Index
        if (indexes.string) {
            _.each(indexes.string, function (attribute, key) {
                if (set[attribute]) { // if set attribute exists
                    result['_si' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
                }
            });
        }

        // Number Index
        if (indexes.number) {
            _.each(indexes.number, function (attribute, key) {
                if (set[attribute]) { // if set attribute exists
                    result['_ni' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
                }
            });
        }

        return _.extend(set, result);
    }

    // # Normalize Response Data
    // - Replace _key for key
    // - Remove useless data for user
    function _normalizeReponseData(data) {

        var _data = _.extend({}, data); // New reference is required do never influence in another operation

        if (_data._key) {
            _data.key = data._key;
        }

        delete _data._key;
        delete _data._namespace;
        delete _data._pi; // Priority index
        delete _data._si0; // String index 0
        delete _data._si1; // String index 1
        delete _data._ni0; // Number index 0
        delete _data._ni1; // Number index 1

        return _data;
    }

    // # Response
    // - Do socket response
    function _response() {

        var attrs = {};

        // Delay execution 150 ms
        setTimeout(_exec, 150);

        return{
            all: all,
            data: data,
            operation: operation,
            error: error,
            me: me
        };

        /*=============================*/

        // # Exec
        function _exec() {
            if (attrs.err) {
                io.to(attrs.to).emit('responseError', attrs.operation, attrs.err);
            } else {
                io.to(attrs.to).emit('responseSuccess', attrs.operation, attrs.data);
            }
        }

        // # All
        function all() {
            attrs.to = params.namespace;

            return this;
        }

        // # Data
        function data(data) {
            attrs.data = data;

            return this;
        }

        // # Event
        function operation(operation) {
            attrs.operation = operation;

            return this;
        }

        // # Error
        function error(err) {
            attrs.err = err.message;

            return this;
        }

        // # Me
        function me() {
            attrs.to = socket.id;

            return this;
        }
    }

    // # Build
    function _buildAlias(names, values) {
        //
        var result = {
            data: {},
            map: {}
        };

        if (!names) {
            return false;
        }

        // Names
        result.data.names = {};
        result.map.names = [];

        if (!_.isArray(names)) {
            names = [names];
        }

        _.each(names, function (value, index) {
            var id = cuid();
            // Set name
            result.data.names[id] = value.trim();
            // Add on map
            result.map.names.push('#' + id);
        });

        // Valus
        if (values) {
            //
            result.data.values = {};
            result.map.values = [];

            if (!_.isArray(values)) {
                values = [values];
            }

            _.each(values, function (value) {
                var id = cuid();
                // Set value
                result.data.values[id] = value;
                // Add on map
                result.map.values.push(':' + id);
            });
        }

        return result;
    }

    // # Item
    function _item() {
        // Item Operation
        var itemAttrs = {
            where: {
                _namespace: params.namespace
            }
        };

        // Set where if exists, using key
        if (params.query) {
            itemAttrs.where._key = params.query;
        }

        // Select
        if (params.select) {
            // Split comma's
            var selectArray = params.select.split(',');

            // Always select _key
            selectArray.push('_key');

            // Build Alias
            var alias = _buildAlias(selectArray);

            itemAttrs.alias = alias.data;
            itemAttrs.select = alias.map.names.join();
        }

        return _syncItem(itemAttrs);
    }

    // # Query
    function _query() {
        // Query Operation
        var queryAttrs = {
            consistent: params.consistent,
            limit: params.limit,
            startAt: params.startAt,
            where: {
                _namespace: ['=', params.namespace]
            }
        };

        // Set where if exists, using key
        if (params.where) {
            queryAttrs.where._key = params.where;
        }

        // Select
        if (params.select) {
            // Split comma's
            var selectArray = params.select.split(',');

            // Always select _key
            selectArray.push('_key');

            // Build Alias
            var alias = _buildAlias(selectArray);

            queryAttrs.alias = alias.data;
            queryAttrs.select = alias.map.names.join();
        }

        // Indexes
        if (params.index && params.indexes) {
            // Discover and get Index
            var index = _discoverIndex(params.indexes, params.index);

            // Set indexed by
            queryAttrs.indexedBy = index.name;

            // Set where if exists
            if (params.where) {
                // Remove default key where
                delete queryAttrs.where._key;
                // Append indexed where
                queryAttrs.where[index.attribute] = params.where;
            }
        }

        return _syncQuery(queryAttrs);
    }

    // # Insert
    // - Execute dynamo insert
    function _syncInsert(attrs) {

        var insert = dynamoInsert.item('tblLive1');

        if (attrs.set)
            insert.set(attrs.set);

        return insert.exec();
    }

    // # Sync Item
    // - Execute dynamo item
    function _syncItem(attrs) {
        var item = dynamoGet.item('tblLive1');

        if (attrs.alias)
            item.alias(attrs.alias);

        if (attrs.select)
            item.select(attrs.select);

        if (attrs.where)
            item.where(attrs.where);

        return item.exec();
    }

    // # Sync Query
    // - Execute dynamo query
    function _syncQuery(attrs) {
        //
        var query = dynamoGet.queryItems('tblLive1');

        if (attrs.alias)
            query.alias(attrs.alias);

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

        return query.exec();
    }

    // # Sync Update
    // - Execute dynamo update
    function _syncUpdate(attrs) {

        var update = dynamoUpdate.item('tblLive1');

        if (attrs.alias)
            update.alias(attrs.alias);

        if (attrs.set)
            update.set(attrs.set);

        if (attrs.where)
            update.where(attrs.where);

        return update.exec();
    }
}