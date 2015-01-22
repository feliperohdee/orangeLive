// # DynamoDb Live
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var cuid = new require('cuid');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        // # Request
        socket.on('request', function (operation, params) {
            var live = orangeLive(params, socket);

            if (live[operation]) {
                live[operation]().then(function (result) {
                    // Ok response
                    if (_.isArray(result) || _.isObject(result)) {
                        live.socketResponse()
                                .me()
                                .operation('sync:' + operation)
                                .data(result);
                    }
                }).catch(function (err) {
                    // Error response
                    live.socketResponse()
                            .me()
                            .operation('sync:' + operation)
                            .error(err);
                });
            }
        });
    });

    // # Orange Live
    function orangeLive(params, socket) {
        //
        return{
            atomicUpdate: atomicUpdate,
            insert: insert,
            item: item,
            join: join,
            leave: leave,
            pushList: pushList,
            query: query,
            socketResponse: socketResponse,
            update: update
        };

        /*----------------------------*/

        // # Item Operation
        function item() {
            return Promise.try(function () {
                // Define item params
                return {
                    where: {
                        _namespace: params.namespace
                    }
                };
            }).then(function (itemParams) {
                // Define default where
                if (params.where) {
                    itemParams.where._key = params.where;
                }

                return itemParams;
            }).then(function (itemParams) {
                // Define Select
                if (params.select) {
                    // Split comma's, always include _key
                    var selectArray = params.select.split(',').concat('_key');

                    // Build Alias
                    var alias = _buildAlias(selectArray);

                    itemParams.alias = alias.data;
                    itemParams.select = alias.map.names.join();
                }

                return itemParams;
            }).then(function (itemParams) {
                // Fetch item
                return base.item(itemParams);
            }).then(function (result) {
                // Normalize data
                result.data = _normalizeReponseData(result.data);

                return result;
            });
        }

        // ## Insert Operation
        function insert() {
            return Promise.try(function () {
                // Build Insert params
                return {
                    set: _.extend(params.set, {
                        _namespace: params.namespace,
                        _key: params.set.key || '-' + cuid(), // Generate new key if no one provided
                        _pi: params.priority || 0 // Priority Index
                    })
                };
            }).then(function (insertParams) {
                // Encode Indexes
                if (params.indexes) {
                    insertParams.set = _encodeIndexSet(insertParams.set);
                }

                return insertParams;
            }).then(function (insertParams) {
                // Broadcast Operation
                socketResponse()
                        .all()
                        .operation('broadcast:insert')
                        .data(_normalizeReponseData(insertParams.set));

                return insertParams;
            }).then(function (insertParams) {
                // Sync Data
                return base.insert(insertParams).then(function () {
                    return true;
                });
            });
        }

        // # Join Operation
        function join() {
            // Join new namespace, if not connected yet
            return Promise.try(function () {
                if (!socket.rooms[params.namespace]) {
                    socket.join(params.namespace);
                    return true;
                }

                return false;
            });
        }

        // # Leave Operation
        function leave() {
            // Leave namespace
            if (params.namespace !== socket.id) {
                socket.leave(params.namespace);
            }
        }

        // # Push List Operation
        function pushList() {
            return Promise.try(function () {
                // Build Alias
                // Double array required => First to perform _buildAlias and another is the kind of data
                var alias = _buildAlias(params.set.attribute, [[params.set.value]]);

                if (!alias) {
                    throw new Error('Invalid attribute or value.');
                }

                return alias;
            }).then(function (alias) {
                // Build expression and define update params
                var expression;

                if (_.isObject(params.set.value)) {
                    // Expression for [{map}]
                    expression = 'SET ' + alias.map.names[0] + ' = list_append(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                } else {
                    // Expression for SS or NS
                    expression = 'ADD ' + alias.map.names[0] + ' ' + alias.map.values[0];
                }

                return {
                    alias: alias.data,
                    set: expression,
                    where: {
                        _namespace: params.namespace,
                        _key: params.where
                    }
                };
            }).then(function (updateParams) {
                // Sync Data
                return base.update(updateParams).then(function (res) {

                    // Broadcast Operation
                    // - Just broadcast when operation is done because it can fail when data type doesn't match
                    socketResponse()
                            .all()
                            .operation('broadcast:pushList')
                            .data(_normalizeReponseData(_.extend({
                                attribute: params.set.attribute,
                                value: params.set.value
                            }, updateParams.where)));

                    return true;
                });
            });
        }

        // # Query Operation
        function query() {
            return Promise.try(function () {
                // Build initial query params
                return {
                    consistent: params.consistent,
                    desc: params.desc,
                    limit: params.limit,
                    startAt: params.startAt,
                    where: {
                        _namespace: ['=', params.namespace]
                    }
                };
            }).then(function (queryParams) {
                // Set default where if exists
                if (params.where) {
                    queryParams.where._key = params.where;
                }

                return queryParams;
            }).then(function (queryParams) {
                // Define Select
                if (params.select) {
                    if (params.select === 'COUNT') {
                        queryParams.select = 'COUNT';
                    } else {
                        // Split comma's, always include _key
                        var selectArray = params.select.split(',').concat('_key');

                        // Build Alias
                        var alias = _buildAlias(selectArray);

                        queryParams.alias = alias.data;
                        queryParams.select = alias.map.names.join();
                    }
                }

                return queryParams;
            }).then(function (queryParams) {
                // Define Indexes
                if (params.index && params.indexes) {
                    // Discover and get Index
                    var index = _discoverIndex(params.index);

                    // Set indexed by
                    queryParams.indexedBy = index.name;

                    // Set where if exists
                    if (params.where) {
                        // Remove default key where
                        delete queryParams.where._key;
                        // Append indexed where
                        queryParams.where[index.attribute] = params.where;
                    }
                }

                return queryParams;
            }).then(function (queryParams) {
                // Fetch query 
                return base.query(queryParams);
            }).then(function (result) {
                // Normalize data
                result.data = _.map(result.data, function (data) {
                    return _normalizeReponseData(data);
                });

                return result;
            });
        }

        // # Response
        function socketResponse() {

            var responseParams = {};

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
                if (responseParams.err) {
                    io.to(responseParams.to).emit('responseError', responseParams.operation, responseParams.err);
                } else {
                    io.to(responseParams.to).emit('responseSuccess', responseParams.operation, responseParams.data);
                }
            }

            // # All
            function all() {
                responseParams.to = params.namespace;

                return this;
            }

            // # Data
            function data(data) {
                responseParams.data = data;

                return this;
            }

            // # Event
            function operation(operation) {
                responseParams.operation = operation;

                return this;
            }

            // # Error
            function error(err) {
                responseParams.err = err.message;

                return this;
            }

            // # Me
            function me() {
                responseParams.to = socket.id;

                return this;
            }
        }

        // # Atomic Update
        function atomicUpdate() {
            return Promise.try(function () {
                // Seek for Index
                var index = _discoverIndex(params.set.attribute);
                var aliasNames = [params.set.attribute];

                // If index, insert it into alias names
                if (index) {
                    aliasNames.push(index.attribute);
                }

                return aliasNames;
            }).then(function (aliasNames) {
                // Build Alias
                var alias = _buildAlias(aliasNames, params.set.value);

                if (!alias) {
                    throw new Error('Invalid attribute or value.');
                }

                return alias;
            }).then(function (alias) {
                // Build expression and define update params
                //var expression = 'ADD ' + alias.map.names[0] + ' ' + alias.map.values[0];
                var expression = 'SET ' + alias.map.names[0] + ' = ' + alias.map.names[0] + ' + ' + alias.map.values[0];

                // If index, append expression
                if (alias.map.names[1]) {
                    //expression += ', ' + alias.map.names[1] + ' ' + alias.map.values[0];
                    expression += ', ' + alias.map.names[1] + ' = ' + alias.map.names[1] + ' + ' + alias.map.values[0];
                }

                return {
                    alias: alias.data,
                    set: expression,
                    where: {
                        _namespace: params.namespace,
                        _key: params.where
                    }
                };
            }).then(function (updateParams) {
                // Broadcast Operation
                socketResponse()
                        .all()
                        .operation('broadcast:atomicUpdate')
                        .data(_normalizeReponseData(_.extend({
                            attribute: params.set.attribute,
                            value: params.set.value
                        }, updateParams.where)));

                return updateParams;
            }).then(function (updateParams) {
                // Sync Data
                return base.update(updateParams).then(function () {
                    return true;
                });
            });
        }

        // ## Update Operation
        function update() {
            return Promise.try(function () {
                // Validate
                if (!params.where) {
                    throw new Error('validationError: No valid keys provided. Please specify primary key field.');
                }
            }).then(function () {
                // Define update params
                return {
                    set: params.set,
                    where: {
                        _namespace: params.namespace,
                        _key: params.where
                    }
                };
            }).then(function (updateParams) {
                // Encode Indexes
                if (params.indexes) {
                    updateParams.set = _encodeIndexSet(updateParams.set);
                }

                return updateParams;
            }).then(function (updateParams) {
                // Append priority if exists
                if (params.priority) {
                    updateParams.set._pi = params.priority;
                }

                return updateParams;
            }).then(function (updateParams) {
                // Broadcast Operation
                socketResponse()
                        .all()
                        .operation('broadcast:update')
                        .data(_normalizeReponseData(_.extend(updateParams.set, updateParams.where)));

                return updateParams;
            }).then(function (updateParams) {
                // Sync Data
                return base.update(updateParams).then(function () {
                    return true;
                });
            });
        }

        // # Build Alias
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

        // # Discover Index
        function _discoverIndex(index) {
            //
            var result = false;

            // Discover Index
            var string = params.indexes.string.indexOf(index);
            var number = params.indexes.number.indexOf(index);

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
        function _encodeIndexSet(set) {
            var result = {};

            // Always delete key
            delete set.key;

            // String Index
            if (params.indexes.string) {
                _.each(params.indexes.string, function (attribute, key) {
                    if (set[attribute]) { // if set attribute exists
                        result['_si' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
                    }
                });
            }

            // Number Index
            if (params.indexes.number) {
                _.each(params.indexes.number, function (attribute, key) {
                    if (set[attribute]) { // if set attribute exists
                        result['_ni' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
                    }
                });
            }

            // Match indexes results
            return _.extend(set, result);
        }

        // # Normalize Response Data
        // - Replace _key for key
        // - Remove useless data for user
        function _normalizeReponseData(data) {
            //
            var _data = _.extend({}, data); // New reference is required to never influence in another operation

            if (_data._key) {
                _data.key = data._key; // Replace _key for key
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
    }
}