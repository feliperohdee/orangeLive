// # DynamoDb Live
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var cuid = new require('cuid');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        // Resolve namespace from address
        var namespace = resolveNamespace(socket.handshake.query.address);
        var live = orangeLive(namespace, socket);

        // # Request
        socket.on('request', function (operation, params) {
            if (live[operation]) {
                live[operation](params).catch(function (err) {
                    // Error response
                    live.sendError(params, 'tech:' + operation, err);
                });
            }
        });
    });
}

// # Orange Live
function orangeLive(namespace, socket) {
    //
    var lastUpdate = 0;

    return{
        insert: insert,
        item: item,
        join: join,
        query: query,
        sendError: sendError,
        stream: stream,
        update: update
    };

    /*----------------------------*/

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

        // Iterate over names
        _.each(names, function (name, nameIndex) {
            // Split paths from name
            name = name.split('.');

            // Iterate over name do handle path's
            _.each(name, function (value, pathIndex) {
                var id = cuid();
                // Set data.name
                result.data.names[id] = value.trim();

                // Set map.name
                if (pathIndex <= 0) {
                    // Path is root, just push name
                    result.map.names.push('#' + id);
                } else {
                    // It means there is path, then extend map.names[index] with this path
                    result.map.names[nameIndex] += '.#' + id;
                }
            });
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
    function _discoverIndex(indexes, index) {
        //
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

        // Always delete key
        delete set.key;

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

        // Match indexes results
        return _.extend(set, result);
    }

    // ## Insert Operation
    function insert(params) {
        return Promise.try(function () {
            // Build Insert params
            return {
                set: _.extend(params.set, {
                    _namespace: namespace,
                    _key: params.set.key || '-' + cuid() // Generate new key if no one provided
                })
            };
        }).then(function (insertParams) {
            // Append priority if exists
            if (params.priority) {
                insertParams.set._pi = params.priority;
            }

            return insertParams;
        }).then(function (insertParams) {
            // Encode Indexes
            if (params.indexes) {
                insertParams.set = _encodeIndexSet(params.indexes, insertParams.set);
            }

            return insertParams;
        }).then(function (insertParams) {
            // Broadcast Operation
            _sendBroadcast('insert', insertParams.set);

            return insertParams;
        }).then(function (insertParams) {
            // Sync Data
            base.insert(insertParams).catch(function (err) {
                sendError(params, 'sync:insert', err);
            });
        });
    }

    // # Item Operation
    function item(params) {
        return Promise.try(function () {
            // Define item params
            return {
                where: {
                    _namespace: namespace
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
            // Normalize data and send
            result.data = _normalizeReponseData(result.data);

            _sendData('sync:item', result);
        });
    }

    // # Join Operation
    function join() {
        // Join new namespace, if not connected yet
        return Promise.try(function () {
            if (socket.rooms.indexOf(namespace) < 0) {
                socket.join(namespace);
                return true;
            }

            return false;
        });
    }

    // # Query Operation
    function query(params) {
        return Promise.try(function () {
            // Build initial query params
            return {
                consistent: params.consistent,
                desc: params.desc,
                limit: params.limit,
                startAt: params.startAt,
                where: {
                    _namespace: ['=', namespace]
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
            // Define Filter
            if (params.filters.length) {
                //
                var filterExpression = '';
                var filterAlias = {};

                _.each(params.filters, function (filter, index) {
                    //
                    var alias = _buildAlias(filter.attribute, filter.value);

                    if (!alias) {
                        throw new Error('Invalid attribute or value.');
                    }

                    switch (filter.operation) {
                        case 'attrExists':
                            filterExpression += 'attribute_exists(' + alias.map.names[0] + ')';
                            break;
                        case 'attrNotExists':
                            filterExpression += 'attribute_not_exists(' + alias.map.names[0] + ')';
                            break;
                        case 'beginsWith':
                            filterExpression += 'begins_with(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                            break;
                        case 'between':
                            filterExpression += alias.map.names[0] + ' BETWEEN ' + alias.map.values[0] + ' AND ' + alias.map.values[1];
                            break;
                        case 'contains':
                            filterExpression += 'contains(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                            break;
                        case 'equals':
                            filterExpression += alias.map.names[0] + ' = ' + alias.map.values[0];
                            break;
                        case 'greaterThan':
                            filterExpression += alias.map.names[0] + ' >= ' + alias.map.values[0];
                            break;
                        case 'lessThan':
                            filterExpression += alias.map.names[0] + ' <= ' + alias.map.values[0];
                            break;
                        case 'notEquals':
                            filterExpression += alias.map.names[0] + ' <> ' + alias.map.values[0];
                            break;
                    }

                    // If morte than one filter, get next comparision
                    if (index < params.filters.length - 1) {
                        filterExpression += params.filters[index + 1].or ? ' OR ' : ' AND ';
                    }

                    // Extend alias names
                    if (!_.isEmpty(alias.data.names)) {
                        //
                        if (!filterAlias.names) {
                            filterAlias.names = {};
                        }

                        _.extend(filterAlias.names, alias.data.names);
                    }

                    // Extend alias values
                    if (!_.isEmpty(alias.data.values)) {
                        //
                        if (!filterAlias.values) {
                            filterAlias.values = {};
                        }

                        _.extend(filterAlias.values, alias.data.values);
                    }
                });

                // Set filter alias and expression
                queryParams.alias = filterAlias;
                queryParams.withFilter = filterExpression;
            }

            return queryParams;
        }).then(function (queryParams) {
            // Define Indexes
            if (params.index && params.indexes) {
                // Discover and get Index
                var index = _discoverIndex(params.indexes, params.index);

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

            _sendData('sync:query', result);
        });
    }

    // # Send Broadcast
    function _sendBroadcast(operation, data) {
        _socketResponse()
                .all()
                .operation('broadcast:' + operation)
                .data(_normalizeReponseData(data));
    }

    // # Send error
    function sendError(operation, error) {
        // Error response
        _socketResponse()
                .me()
                .operation(operation)
                .error(error);
    }

    // # Send data
    function _sendData(operation, data) {
        // Success response
        _socketResponse()
                .me()
                .operation(operation)
                .data(data);
    }

    // # Response
    function _socketResponse() {
        //
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
            responseParams.to = namespace;

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

    // # Stream {Broadcast data without persistence}
    function stream(params) {
        return Promise.try(function () {
            // Validate
            if (!params.data) {
                throw new Error('validationError: No valid event or data provided.');
            }

            // Valida data length
            if (JSON.stringify(params.data).length > 100) {
                throw new Error('validationError: Data needs to have maximum 100 characteres.');
            }
        }).then(function () {
            // Broadcast Operation
            _sendBroadcast('stream', params.data);
        });
    }

    // ## Update Operation
    function update(params) {
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
                    _namespace: namespace,
                    _key: params.where
                }
            };
        }).then(function (updateParams) {
            // Encode Indexes
            if (params.indexes) {
                updateParams.set = _encodeIndexSet(params.indexes, updateParams.set);
            }

            return updateParams;
        }).then(function (updateParams) {
            // Append priority if exists
            if (params.priority) {
                updateParams.set._pi = params.priority;
            }

            return updateParams;
        }).then(function (updateParams) {
            // If special update operation
            if (params.special) {
                // Build Alias
                var alias;
                var expression;

                switch (params.special) {
                    case 'atomic':
                        // Build Alias
                        alias = _buildAlias(_.keys(updateParams.set), _.uniq(_.values(updateParams.set)));

                        if (!alias) {
                            throw new Error('Invalid attribute or value.');
                        }

                        // Build expression and define update param
                        expression = 'SET ' + alias.map.names[0] + ' = ' + alias.map.names[0] + ' + ' + alias.map.values[0];

                        // If index, append expression
                        if (alias.map.names[1]) {
                            expression += ', ' + alias.map.names[1] + ' = ' + alias.map.names[1] + ' + ' + alias.map.values[0];
                        }
                        break;
                    case 'push':
                        // Build Alias
                        alias = _buildAlias(_.keys(updateParams.set), _.uniq([_.values(updateParams.set)])); // <= Array notation is required

                        if (!alias) {
                            throw new Error('Invalid attribute or value.');
                        }

                        if (_.isObject(params.set.value)) {
                            // Expression for [{map}]
                            expression = 'SET ' + alias.map.names[0] + ' = list_append(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                        } else {
                            // Expression for SS or NS
                            expression = 'ADD ' + alias.map.names[0] + ' ' + alias.map.values[0];
                        }
                        break;
                }

                // Extend update params with alias, and expression
                _.extend(updateParams, {
                    alias: alias.data,
                    set: expression
                });
            }

            return updateParams;
        }).then(function (updateParams) {
            // Broadcast Operation {data is extended because other side needs to receive where.key}
            var data = _.extend({}, _.isObject(updateParams.set) ? updateParams.set : params.set, updateParams.where);
            var operation = 'update' + (params.special ? ':' + params.special : '');

            _sendBroadcast(operation, data);

            return updateParams;
        }).then(function (updateParams) {
            // Sync Data {special operations starts immediately, basic update wait 1s}
            if (params.special) {
                updateBase();
            } else {
                clearTimeout(lastUpdate);
                lastUpdate = setTimeout(updateBase, 1000);
            }

            // Just a update function definition
            function updateBase() {
                base.update(updateParams).catch(function (err) {
                    var operation = 'update' + (params.special ? ':' + params.special : '');

                    sendError(params, 'sync:' + operation, err);
                });
            }
        });
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

// # Resolve Namespace
function resolveNamespace(address) {
    // Split address
    address = address.split('/');

    return address[0] + '/' + address[1];
}