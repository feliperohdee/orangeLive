// # orangeLive
var socket = io();

function orangeLive(address) {
    //
    var dataSet = [];
    var eventStack = {};
    var indexes = false;

    return{
        on: on,
        insert: insert,
        defineIndexes: defineIndexes,
        update: update
    };

    /*----------------------------*/

    // # Request
    function _request(operation, params) {
        // Extend params with address
        params = _.extend(params || {}, {
            address: address,
            indexes: indexes
        });

        socket.emit('request', operation, params);
    }

    // # On
    function on(events) {
        //
        var query = {};
        var pagination = {
            current: 0,
            startKeys: [],
            isPrev: false,
            isNext: false
        };

        __construct();

        return{
            between: between,
            equals: equals,
            lessThen: lessThen,
            greatestThen: greatestThen,
            limit: limit,
            select:select,
            startAt: startAt,
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

            // Request join
            _request('join');

            // Request load data
            setTimeout(function () {
                _load();
            }, 500);

            // Start listen sockets
            _bindSockets();
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

                        // If dataset is collection, setup pagination
                        if (_.isArray(dataSet)) {
                            // Set startkeys for the next pagination page
                            if (result.startKey) {
                                pagination.startKeys[0] = null; // => required
                                pagination.startKeys[pagination.current + 1] = result.startKey;
                            }

                            // Enable / Disable Prev and Next
                            pagination.isPrev = (pagination.current <= 0) ? false : true;
                            pagination.isNext = (pagination.current >= pagination.startKeys.length - 1) ? false : true;
                        }

                        // Dispatch load event
                        _dispatchEvent('load', {
                            data: result.data,
                            pagination: pagination
                        });
                        break;
                    case 'insert':
                    case 'update':
                        _dispatchEvent(event, result);
                        _dispatchEvent('collectionUpdate:' + event, result);
                        break;
                    default:
                        console.log(event, result);
                }
            });

            // ### Response Error
            socket.on('responseError', function (event, err) {
                console.error(event, err);
            });
        }

        // ## Dispatch Event
        function _dispatchEvent(event, result) {
            // Split to remove second rule if exists
            var callback = eventStack[event.split(':')[0]];

            if (callback) {
                // Call factory
                switch (event) {
                    case 'collectionUpdate:insert':
                        _collectionInsert(result, callback);
                        break;
                    case 'collectionUpdate:update':
                        _collectionUpdate(result, callback);
                        break;
                    case 'load':
                        // Return Data and Pagination functions
                        callback(result.data, {
                            prev: result.pagination.isPrev ? _paginationPrev : false,
                            next: result.pagination.isNext ? _paginationNext : false
                        });
                        break;
                    case 'insert':
                    case 'update':
                        // Just Return Data
                        callback(result);
                        break;
                }
            }

            // ### Insert in Collection
            function _collectionInsert(data, callback) {
                //
                if (_.isArray(dataSet)) {
                    // If collection, handle data
                    if (_testConditions(data)) {
                        // If pass through condition test, push data, otherwise dataset keeps untouchable
                        dataSet.push(data);
                    }

                    // Sort and Limit
                    dataSet = _sortAndLimit(dataSet);
                }

                // Callback dataSet, if item, keeps untouched
                callback(dataSet);
            }

            //### Update in Collection
            function _collectionUpdate(data, callback) {
                //
                if (_.isArray(dataSet)) {
                    // If collection, handle data
                    var dataSetIndex = _.findIndex(dataSet, {key: data.key});

                    if (_testConditions(data)) {
                        // Passed into tests, update data if exists
                        if (dataSetIndex >= 0) {
                            // Update Item
                            dataSet[dataSetIndex] = data;
                        } else {
                            // Passed into tests but not belongs to collection yet, insert it
                            dataSet.push(data);
                        }
                    } else {
                        // If reproved in the test, remove data if exists
                        if (dataSetIndex >= 0) {
                            dataSet.splice(dataSetIndex, 1);
                        }
                    }

                    // Sort and Limit
                    dataSet = _sortAndLimit(dataSet);
                } else {
                    // Dataset is item, return just updated data
                    dataSet = data;
                }

                // Callback dataSet
                callback(dataSet);
            }

            // # Next Page
            function _paginationNext() {
                //
                if (pagination.isNext) {
                    var startKeysLength = pagination.startKeys.length - 1;

                    if (++pagination.current >= startKeysLength) {
                        pagination.current = startKeysLength;
                    }

                    // Define Start At Key
                    startAt(pagination.startKeys[pagination.current]);

                    _load();
                }
            }

            // # Prev Page
            function _paginationPrev() {
                //
                if (pagination.isPrev) {
                    if (--pagination.current <= 0) {
                        pagination.current = 0;
                    }

                    // Define Start At Key
                    startAt(pagination.startKeys[pagination.current]);

                    _load();
                }
            }

            // ### Sort and Limit
            function _sortAndLimit(data) {
                // Sort
                if (query.index) {
                    data = _.sortBy(data, query.index || 'key');
                }

                // Limit
                if (query.limit) {
                    data = data.slice(0, query.limit);
                }

                return data;
            }

            // ### Test Conditions
            function _testConditions(data) {

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
                        if (data[query.index || 'key'].toLowerCase().indexOf(conditionValue.toLowerCase()) === 0) {
                            return true;
                        }

                        return false;
                    }
                };

                // Test condition
                return conditionsTestsFactory[conditionCase]();
            }
        }

        // ## Load
        function _load(consistent) {
            _request('load', {
                condition: query.condition || false,
                consistent: consistent || false,
                index: query.index || false,
                limit: query.limit || false,
                select: query.select || false,
                startAt: query.startAt || false
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
        
        // ## Select
        function select(select) {
            query.select = select;

            return this;
        }
        
        // ## Start At
        function startAt(key) {
            query.startAt = key;

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

    // # Insert
    function insert(data, priority) {
        //
        _request('insert', {
            data: data,
            priority: priority
        });

        return this;
    }

    // # Push
    function push(data) {
        //
        if(_.isArray(dataSet)){
            
        }
        
        _request('insert', {
            data: data
        });

        return this;
    }

    // # Update
    function update(data, priority) {
        //
        _request('update', {
            data: data,
            priority: priority
        });

        return this;
    }

    // # Define Indexes
    function defineIndexes(value) {
        indexes = value;

        return this;
    }
}