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
    function _request(operation, params, responseType) {
        // Extend params with address
        params = _.extend(params || {}, {
            address: address,
            indexes: indexes,
            responseType: responseType || false
        });

        socket.emit('request', operation, params);
    }

    // # On
    function on(events) {

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
            _.each(events, function (callback, event) {
                eventStack[event] = callback;
            });

            // Request join to address
            _request('join');

            // Request load data
            setTimeout(function () {
                _load();
            }, 500);

            // Start listen sockets
            _bindSockets();
        }

        // ## Load
        function _load(consistent) {
            _request('load', {
                condition: query.condition || false,
                consistent: consistent || false,
                limit: query.limit || false,
                index: query.index || false
            });
        }

        // ## Bind Sockets
        function _bindSockets() {

            // ### Response Success
            socket.on('responseSuccess', function (event, result) {
                //
                switch (event) {
                    case 'load':
                        // Update Data Set 
                        dataSet = result.data;

                        _dispatchEvents([event], result);
                        break;
                    default:
                        //
                        _dispatchEvents([event, 'collectionUpdate'], result);
                }
            });

            // ### Response Error
            socket.on('responseError', function (err) {
                console.error(err);
            });
        }

        // ## Dispatch Events
        function _dispatchEvents(events, result) {
            // Iterate over events, and test with previous registered ~on
            _.each(events, function (event) {
                //
                var callback = eventStack[event];

                if (callback) {
                    // Call factory
                    switch (event) {
                        case 'add':
                        case 'change':
                        case 'load':
                            // Just Return Data
                            callback(result.data);
                            break;
                        case 'collectionUpdate':
                            _onCollectionUpdate(result, callback);
                            break;
                    }
                }
            });

            // ### Insert in Collection
            function _insertCollection(data, callback) {
                if (_testCondition(data)) {
                    // If pass through condition test, push data, otherwise dataset keeps untouchable
                    dataSet.push(data);
                }

                // Sort
                if (query.index) {
                    dataSet = _.sortBy(dataSet, query.index || '_key');
                }

                // Limit
                if (query.limit) {
                    dataSet = dataSet.slice(0, query.limit);
                }

                // Dataset is array, callback all there
                callback(dataSet);
            }

            // ### On Collection Update
            function _onCollectionUpdate(result, callback) {
                // Get operation which triggered Collection Update event
                switch (result.operation) {
                    case 'insert':
                        _insertCollection(result.data, callback);
                        break;
                    case 'update':
                        // Call consistent load again when update
                        _load(true);
                        break;
                }
            }

            // ### Test Condition
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