// # orangeLive
var socket = io();

function orangeLive(namespace) {
    //
    var firstOn = true;
    var query = {};
    var onStack = [];
    var dataSet = [];

    __construct();

    return{
        between: between,
        equals: equals,
        greatestThen: greatestThen,
        limit: limit,
        lessThen: lessThen,
        on: on,
        set: set,
        startsWith: startsWith
    };

    /*----------------------------*/

    // # Between
    function between(valueLow, valueHigh) {
        query.where = {
            key: ['~', valueLow, valueHigh]
        };

        return this;
    }

    // # Equals
    function equals(value) {
        query.where = {
            key: ['=', value]
        };

        return this;
    }

    // # Less Then
    function lessThen(value) {
        query.where = {
            key: ['<=', value]
        };

        return this;
    }

    // # Greatest Then
    function greatestThen(value) {
        query.where = {
            key: ['>=', value]
        };

        return this;
    }

    // # Limit
    function limit(limit) {
        query.limit = limit;

        return this;
    }

    // # On
    function on(type, callback) {

        // Append OnStack with {load, add, change, remove, dataUpdate}, and callback
        onStack.push({
            type: type,
            callback: callback
        });

        // It executes just on first on call
        if (firstOn) {
            // Request join
            _request('join');

            // Do First Load
            if (namespace.indexOf('/') >= 0) {
                _request('item', {
                    where: {
                        namespace: namespace.split('/')[0],
                        key: namespace.split('/')[1]
                    }
                });
            } else {
                _request('query', {
                    limit: query.limit || 500,
                    where: _.extend(query.where || {}, {
                        namespace: ['=', namespace]
                    })
                });
            }

            firstOn = false;
        }

        return this;
    }

    // # Set
    function set() {
        //
        if (namespace.indexOf('/') >= 0) {
            _request('set', {
                set: {
                    namespace: namespace.split('/')[0],
                    key: namespace.split('/')[1],
                    name: +new Date + ' hy ho lts go'
                }
            });
        } else {
            _request('set', {
                set: {
                    namespace: namespace,
                    name: +new Date + ' hy ho lts go'
                }
            });
        }

        return this;
    }

    // # Starts With
    function startsWith(value) {
        query.where = {
            key: ['^', value]
        };

        return this;
    }

    // # Constructor
    function __construct() {
        //
        _bindSockets();
    }

    // # Bind Sockets
    function _bindSockets() {
        // # Response Success
        socket.on('responseSuccess', function (operation, result) {
            //
            var operationFactory = {
                set: function () {
                    // Dispatch [add, dataUpdate] event
                    _dispatchEvent(['add', 'dataUpdate'], result.data);
                },
                item: function () {
                    // Update Data Set
                    dataSet = result.data;
                    // Dispatch [load] event
                    _dispatchEvent(['load'], result.data);
                },
                query: function () {
                    // Update Data Set
                    dataSet = result.data;
                    // Dispatch [load] event
                    _dispatchEvent(['load'], result.data);
                }
            };

            // Feed dataSet according to operation done
            if (result.data) {
                operationFactory[operation]();
            }
        });

        // # Response Error
        socket.on('responseError', function (operation, err) {
            console.error(operation, err);
        });
    }

    // # Dispatch Event
    function _dispatchEvent(type, data) {
        // On Factory
        var onFactory = {
            add: function (callback) {
                // Add just return data
                callback(data);
            },
            load: function (callback) {
                // Load just return data
                callback(data);
            },
            dataUpdate: function (callback) {
                // new instance, data is gonna be manipulated
                var _data = _.extend({}, data);

                // Data needs to be processed with existent data
                if (_.isArray(dataSet)) {
                    _data = dataSet.concat(data);

                    // Sort (To Do)

                    // Limit
                    if (query.limit) {
                        _data = _data.splice(0, query.limit);
                    }
                }

                callback(_data);
            }
        };

        // Iterate over registered ~on tasks
        _.each(onStack, function (on) {
            // If type matches some registered ~on
            if (type.indexOf(on.type) >= 0) {
                onFactory[on.type](on.callback);
            }
        });
    }


    // # Request
    function _request(type, params) {
        // Extend params with namespace
        params = _.extend(params || {}, {
            namespace: namespace
        });

        console.log('request', type, params);

        socket.emit('request', type, params);
    }
}