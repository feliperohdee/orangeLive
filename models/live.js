// # DynamoDb Live
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var cuid = new require('cuid');

__construct();

/*---------------------------------*/

function __construct() {
    io.on('connection', function (socket) {
        //
        var live = orangeLive(socket);

        // # Request
        socket.on('request', function (operation, params) {
            // Resolve namespace from address
            params.namespace = resolveNamespace(params.address);

            if (live[operation]) {
                live[operation](params).then(function (result) {
                    // Ok response
                    if (_.isArray(result) || _.isObject(result)) {
                        live.socketResponse(params)
                                .me()
                                .operation('sync:' + operation)
                                .data(result);
                    }
                }).catch(function (err) {
                    // Error response
                    live.socketResponse(params)
                            .me()
                            .operation('sync:' + operation)
                            .error(err);
                });
            }
        });
    });
}

// # Orange Live
function orangeLive(socket) {
    //
    return{
        atomicUpdate: atomicUpdate,
        insert: insert,
        item: item,
        join: join,
        pushList: pushList,
        query: query,
        socketResponse: socketResponse,
        stream: stream,
        update: update
    };

    /*----------------------------*/

    // # Atomic Update
    function atomicUpdate(params) {
        return Promise.try(function () {
            // Seek for Index
            var index = _discoverIndex(params.indexes, params.set.attribute);
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
            var expression = 'SET ' + alias.map.names[0] + ' = ' + alias.map.names[0] + ' + ' + alias.map.values[0];

            // If index, append expression
            if (alias.map.names[1]) {
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
            // Broadcast Operation {data is extended because set is an expression}
            socketResponse(params)
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
                    _namespace: params.namespace,
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
            socketResponse(params)
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

    // # Item Operation
    function item(params) {
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

    // # Join Operation
    function join(params) {
        // Join new namespace, if not connected yet
        return Promise.try(function () {
            if (socket.rooms.indexOf(params.namespace) < 0) {
                socket.join(params.namespace);
                return true;
            }

            return false;
        });
    }

    // # Push List Operation
    function pushList(params) {
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
                // Broadcast Operation {data is extended because set is an expression}
                // - Just broadcast when operation is done because it can fail when data type doesn't match
                socketResponse(params)
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
    function query(params) {
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

            return result;
        });
    }

    // # Response
    function socketResponse(params) {
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
            socketResponse(params)
                    .all()
                    .operation('broadcast:stream')
                    .data(params.data);

            return true;
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
                    _namespace: params.namespace,
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
            // Broadcast Operation {data is extended because other side needs to receive where.key}
            socketResponse(params)
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