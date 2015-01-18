// # orangeLive
var socket = io();

function orangeLive(namespace) {
    //
    var indexes = false;
    var eventStack = {};

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
            // Append eventStack with {load, add, change, remove, dataUpdate}, and callback
            _.each(operation, function (callback, type) {
                eventStack[type] = callback;
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
                        _dispatchEvents(['add', 'dataUpdate'], result.data, 'insert');
                    },
                    // Item
                    item: function () {
                        // Update Data Set
                        dataSet = result.data;
                        // Dispatch [load] event => might be called once per on object
                        if (!isLoaded) {
                            _dispatchEvents(['load'], result.data);
                            isLoaded = true;
                        }
                    },
                    // Query
                    query: function () {
                        // Update Data Set 
                        dataSet = result.data;
                        // Dispatch [load] event => might be called once per on object
                        if (!isLoaded) {
                            _dispatchEvents(['load'], result.data);
                            isLoaded = true;
                        }
                    }
                };

                // Feed dataSet according to operation done
                if (result.data) {
                    // Call factory
                    operationFactory[operation]();
                }
            });

            // ### Response Error
            socket.on('responseError', function (operation, err) {
                console.error(operation, err);
            });
        }

        // ## Dispatch Events
        function _dispatchEvents(events, data, fromEvent) {
            // Event Factory
            var eventFactory = {
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
                    var fromEventFactory = {
                        // From insert event
                        insert: function () {
                            if (_.isArray(dataSet)) {
                                // If dataset is a collection, new data is gonna be pushed to collection
                                _insertCollection(data, callback);
                            }
                        }
                    };

                    // Call factory
                    fromEventFactory[fromEvent]();
                }
            };

            // Iterate over events, and test with previous registered ~on
            _.each(events, function (event) {
                if (eventStack[event]) {
                    // Call factory
                    eventFactory[event](eventStack[event]);
                }
            });
        }

        //# # Insert in Collection
        function _insertCollection(data, callback) {
            if (query.condition) {
                if (_testCondition(data)) {
                    // If pass through condition test, push data, otherwise dataset keeps untouchable
                    dataSet.push(data);
                }
            } else {
                // If no query condition, always push data to dataSet, without tests
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

        // ## Test Condition
        function _testCondition(data) {
            // Define conditions
            var conditionCase = query.condition[0];
            var conditionValue = query.condition[1];

            if (query.condition[2]) {
                conditionValue = [query.condition[1], query.condition[2]];
            }

            var conditionsTestsFactory = {
                // Between test
                '~': function () {
                    if (data[query.index || 'key'] >= conditionValue[0] && data[query.index || 'key'] <= conditionValue[1]) {
                        return true;
                    }

                    return false;
                },
                // Equals test
                '=': function () {
                    if (data[query.index || 'key'] === conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Less then test
                '<=': function () {
                    if (data[query.index || 'key'] <= conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Greatest then test
                '>=': function () {
                    if (data[query.index || 'key'] >= conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Starts with test
                '^': function () {
                    if (data[query.index || 'key'].toLowerCase().indexOf(conditionValue.toLowerCase()) >= 0) {
                        return true;
                    }

                    return false;
                }
            };

            // Test condition
            return conditionsTestsFactory[conditionCase]();
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