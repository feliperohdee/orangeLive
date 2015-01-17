// # orangeLive
var socket = io();

function orangeLive(namespace) {
    //
    var indexes = false;
    var onBindings = [];

    return{
        on: on,
        set: set,
        defineIndexes: defineIndexes
    };

    /*----------------------------*/

    // # Request
    function _request(type, params) {
        // Extend params with namespace
        params = _.extend(params || {}, {
            namespace: namespace,
            indexes: indexes
        });

        socket.emit('request', type, params);
    }

    // # On
    function on(operation) {

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

        // ## Construct
        function __construct() {
            // Append onBindings with {load, add, change, remove, dataUpdate}, and callback
            _.each(operation, function (callback, type) {
                onBindings.push({
                    type: type,
                    callback: callback
                });
            });

            // Request join to namespace
            _request('join');

            // Delay 500ms to first load
            _.debounce(_load, 500)();

            // Start listen sockets
            _bindSockets();
        }

        // ## Bind Sockets
        function _bindSockets() {

            var isLoaded = false;

            // ### Response Success
            socket.on('responseSuccess', function (operation, result) {
                //
                var operationFactory = {
                    // Insert
                    insert: function () {
                        // Dispatch [add, dataUpdate] event
                        _dispatchEvent(['add', 'dataUpdate'], result.data);
                    },
                    // Item
                    item: function () {
                        // Update Data Set
                        dataSet = result.data;
                        // Dispatch [load] event => might be called once per on object
                        if (!isLoaded) {
                            _dispatchEvent(['load'], result.data);
                            isLoaded = true;
                        }
                    },
                    // Query
                    query: function () {
                        // Update Data Set 
                        dataSet = result.data;
                        // Dispatch [load] event => might be called once per on object
                        if (!isLoaded) {
                            _dispatchEvent(['load'], result.data);
                            isLoaded = true;
                        }
                    }
                };

                // Feed dataSet according to operation done
                if (result.data) {
                    operationFactory[operation]();
                }
            });

            // ### Response Error
            socket.on('responseError', function (operation, err) {
                console.error(operation, err);
            });
        }

        // ## Dispatch Event
        function _dispatchEvent(type, data) {
            // On Factory
            var onFactory = {
                // Add Event
                add: function (callback) {
                    // Add just return data
                    callback(data);
                },
                // Load Event
                load: function (callback) {
                    // Load just return data
                    callback(data);
                },
                // Data Update Event
                dataUpdate: function (callback) {
                    // new instance, data is gonna be manipulated
                    var _data = _.extend({}, data);

                    // Data needs to be processed with existent data
                    if (_.isArray(dataSet)) {
                        if (query.condition) {

                            // Define conditions
                            var conditionCase = query.condition[0];
                            var conditionValue = query.condition[1];

                            if (query.condition[2]) {
                                conditionValue = [query.condition[1], query.condition[2]];
                            }

                            // Need to pass through conditions
                            var conditionsTests = {
                                // Between test
                                '~': function () {
                                    if (_data[query.index || 'key'] >= conditionValue[0] && _data[query.index || 'key'] <= conditionValue[1]) {
                                        return true;
                                    }

                                    return false;
                                },
                                // Equals test
                                '=': function () {
                                    if (_data[query.index || 'key'] === conditionValue) {
                                        return true;
                                    }

                                    return false;
                                },
                                // Less then test
                                '<=': function () {
                                    if (_data[query.index || 'key'] <= conditionValue) {
                                        return true;
                                    }

                                    return false;
                                },
                                // Greatest then test
                                '>=': function () {
                                    if (_data[query.index || 'key'] >= conditionValue) {
                                        return true;
                                    }

                                    return false;
                                },
                                // Starts with test
                                '^': function () {
                                    if (_data[query.index || 'key'].toLowerCase().indexOf(conditionValue.toLowerCase()) >= 0) {
                                        return true;
                                    }

                                    return false;
                                }
                            };

                            // Test condition
                            if (conditionsTests[conditionCase]()) {
                                // If pass through condition test, push data, otherwise dataset keeps untouchable
                                dataSet.push(data);
                            }
                        } else {
                            // If no query condition, always push data to dataSet
                            dataSet.push(data);
                        }

                        // Sort
                        if (query.index) {
                            dataSet = _.sortBy(dataSet, query.index || 'key');
                        }

                        // Limit
                        if (query.limit) {
                            dataSet = dataSet.slice(0, query.limit);
                        }
                        
                        // Dataset is array, callback all there
                        callback(dataSet);
                    }else{
                        // Dataset not an array, callback just data
                        callback(_data);
                    }
                }
            };

            // Iterate over registered ~on binding tasks
            _.each(onBindings, function (on) {
                // If type matches some registered ~on
                if (type.indexOf(on.type) >= 0) {
                    onFactory[on.type](on.callback);
                }
            });
        }

        // ## Load
        function _load() {
            // Do Get
            _request('get', {
                condition: query.condition || false,
                limit: query.limit || false,
                index: query.index || false
            });
        }

        // ## Between
        function between(valueLow, valueHigh) {
            query.condition = ['~', valueLow, valueHigh];

            return this;
        }

        // ## Equals
        function equals(value) {
            query.condition = ['=', value];

            return this;
        }

        // ## Less Then
        function lessThen(value) {
            query.condition = ['<=', value];

            return this;
        }

        // ## Greatest Then
        function greatestThen(value) {
            query.condition = ['>=', value];

            return this;
        }

        // ## Limit
        function limit(limit) {
            query.limit = limit;

            return this;
        }

        // ## Starts With
        function startsWith(value) {
            query.condition = ['^', value];

            return this;
        }

        // ## Use Index
        function useIndex(index) {
            query.index = index;

            return this;
        }
    }

    // # Set
    function set(data) {
        //
        _request('set', {
            set: data
        });

        return this;
    }

    // # Define Indexes
    function defineIndexes(value) {
        indexes = value;

        return this;
    }
}