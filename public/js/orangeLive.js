// # orangeLive
var socket = io();

function orangeLive(address) {
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
    function _request(type, params, responseType) {
        // Extend params with address
        params = _.extend(params || {}, {
            address: address,
            indexes: indexes,
            responseType: responseType || false
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
            // Append eventStack with {load, add, change, remove, collectionUpdate}, and callback
            _.each(operation, function (callback, type) {
                eventStack[type] = callback;
            });

            // Request join to address
            _request('join');

            // Delay 500ms to first load
            _.debounce(_get, 500)();

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
                        // Dispatch [add, collectionUpdate] event
                        _dispatchEvents(['add', 'collectionUpdate'], result.data, 'insert');
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
                    },
                    // Update
                    update: function () {
                        // Dispatch [change, collectionUpdate] event
                        _dispatchEvents(['change', 'collectionUpdate'], result.data, 'update');
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
                // Change Event
                change: function (callback) {
                    // Add just return data
                    callback(data);
                },
                // Load Event
                load: function (callback) {
                    // Load just return data
                    callback(data);
                },
                // Collection Update Event
                collectionUpdate: function (callback) {
                    var fromEventFactory = {
                        // From insert event
                        insert: function () {
                            _insertCollection(data, callback);
                        },
                        // From update event
                        update: function () {
                            _updateCollection(data, callback);
                        }
                    };

                    // Call factory
                    if (_.isArray(dataSet)) {
                        fromEventFactory[fromEvent]();
                    }
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
        
        // ## Get
        function _get() {
            // Do Get
            _request('get', {
                condition: query.condition || false,
                limit: query.limit || false,
                index: query.index || false
            });
        }

        //# # Insert in Collection
        function _insertCollection(data, callback) {
            if (_testCondition(data)) {
                // If pass through condition test, push data, otherwise dataset keeps untouchable
                dataSet.push(data);
            }

            // Sort and Limit
            dataSet = _organizeCollection(dataSet);

            // Dataset is array, callback all there
            callback(dataSet);
        }

        // ## Organize Collection => Sort and Limit
        function _organizeCollection(data) {
            // Sort
            if (query.index) {
                data = _.sortBy(data, query.index || '_key');
            }

            // Limit
            if (query.limit) {
                data = data.slice(0, query.limit);
            }

            return data;
        }

        // ## Test Condition
        function _testCondition(data) {

            // If no condition, always pass
            if (!query.condition) {
                return true;
            }

            // Define conditions
            var conditionCase = query.condition[0];
            var conditionValue = query.condition[1];

            if (query.condition[2]) {
                conditionValue = [query.condition[1], query.condition[2]];
            }

            var conditionsTestsFactory = {
                // Between test
                '~': function () {
                    if (data[query.index || '_key'] >= conditionValue[0] && data[query.index || '_key'] <= conditionValue[1]) {
                        return true;
                    }

                    return false;
                },
                // Equals test
                '=': function () {
                    if (data[query.index || '_key'] === conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Less then test
                '<=': function () {
                    if (data[query.index || '_key'] <= conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Greatest then test
                '>=': function () {
                    if (data[query.index || '_key'] >= conditionValue) {
                        return true;
                    }

                    return false;
                },
                // Starts with test
                '^': function () {
                    if (data[query.index || '_key'].toLowerCase().indexOf(conditionValue.toLowerCase()) >= 0) {
                        return true;
                    }

                    return false;
                }
            };

            // Test condition
            return conditionsTestsFactory[conditionCase]();
        }

        //# # Update in Collection
        function _updateCollection(data, callback) {

            var dataSetIndex = _.findIndex(dataSet, {_key: data._key});

            if (_testCondition(data)) {
                // If pass through condition test, update data if exists
                if (dataSetIndex >= 0) {
                    // Update Item
                    dataSet[dataSetIndex] = data;
                } else {
                    // Passed in the test but no belongs to collection yet, so insert it
                    dataSet.push(data);
                }
            } else {
                // If reproved in the test, remove data if exists
                if (dataSetIndex >= 0) {
                    dataSet.splice(dataSetIndex, 1);
                }
            }

            // Sort and Limit
            dataSet = _organizeCollection(dataSet);

            // Dataset is array, callback all there
            callback(dataSet);
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