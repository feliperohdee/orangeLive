// # orangeLive
var socket = io();

function orangeLive(namespace) {
    //
    var index = false;
    var onStack = [];

    return{
        on: on,
        set: set,
        setIndex: setIndex
    };

    /*----------------------------*/

    // # Request
    function _request(type, params) {
        // Extend params with namespace
        params = _.extend(params || {}, {
            namespace: namespace
        });

        console.log('request', type, params);

        socket.emit('request', type, params);
    }

    // # On
    function on(operation) {

        var firstOn = false;
        var query = {};
        var dataSet = [];

        __construct();

        return{
            between: between,
            equals: equals,
            lessThen: lessThen,
            greatestThen: greatestThen,
            limit: limit,
            startsWith: startsWith,
            useIndex: useIndex
        };

        /*--------------------------------------*/

        function __construct() {
            // Append OnStack with {load, add, change, remove, dataUpdate}, and callback
            _.each(operation, function (callback, type) {
                onStack.push({
                    type: type,
                    callback: callback
                });
            });

            if (!firstOn) {
                _.debounce(_firstLoad, 500)();
            }

            _bindSockets();
        }

        // # Bind Sockets
        function _bindSockets() {
            // # Response Success
            socket.on('responseSuccess', function (operation, result) {
                //
                var operationFactory = {
                    insert: function () {
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

                        // Sort
                        if (query.useIndex) {
                            _data = _.sortBy(_data, query.useIndex);
                        }

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

        function _firstLoad() {
            // Request join
            _request('join');

            // Do First Load
            _request('get', {
                namespace: namespace,
                where: query.where || {},
                limit: query.limit || false,
                index: index,
                useIndex: query.useIndex
            });

            firstOn = false;
        }

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

        // # Starts With
        function startsWith(value) {
            query.where = {
                key: ['^', value]
            };

            return this;
        }

        // # Use Index
        function useIndex(index) {
            query.useIndex = index;

            return this;
        }
    }

    // # Set
    function set(data) {
        //
        _request('set', {
            set: data,
            index: index
        });

        return this;
    }

    // # Set Index
    function setIndex(value) {
        index = value;

        return this;
    }
}