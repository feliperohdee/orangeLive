// # orangeLive
function orangeLive(address) {
    //
    'use strict';

    var addressParams = {
        key: address.split('/')[2] || false,
        attribute: address.split('/')[3] || false
    };

    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };

    var instance;
    var isCollection = false;
    var lastChangeTransaction = false;
    var lastPutOperation = 0;
    var putOperationInterval = 100;

    var socket = io({
        forceNew: true
    });

    return __construct();

    /*----------------------------*/

    // # Construct
    function __construct() {
        //
        if (!addressParams.key) {
            // Create and return collection instance
            instance = collection();
            isCollection = true;
        } else {
            // Create and return item instance
            instance = item();
        }

        // Start sockets
        _bindSockets();

        // Expose API
        return instance.api();
    }

    // # Bind Sockets
    function _bindSockets() {
        // # Reponse Success
        socket.on('responseSuccess', function (operation, result) {
            switch (operation) {
                case 'broadcast:insert':
                    // Set last change transaction
                    lastChangeTransaction = result;
                    // Update Collection Dataset
                    if (isCollection) {
                        instance.putDataSet(result);
                        // Dispatch Events
                        dispatchEvents(['put', 'fetch']);
                    }
                    break;
                case 'broadcast:update':
                    // Set last change transaction
                    lastChangeTransaction = result;
                    // Update Collection/Item Dataset
                    instance.putDataSet(result);
                    // Dispatch Events
                    dispatchEvents(['put', 'fetch']);
                    break;
                case 'broadcast:atomicUpdate':
                case 'broadcast:pushList':
                    // Get atomicUpdate or pushList
                    var specialOperation = operation.split(':')[1];
                    var value = instance.handleSpecialOperation(specialOperation, result);

                    if (value) {
                        // Set last change transaction
                        lastChangeTransaction = value;
                        // Update Collection/Item Dataset
                        instance.putDataSet(value);
                        // Dispatch Events
                        dispatchEvents(['put', 'fetch']);
                    }
                    break;
                case 'sync:item':
                case 'sync:query':
                    if (!isCollection) {
                        // Set last change transaction to support item.isOwn() method
                        lastChangeTransaction = result.data;
                    }
                    // Load Data
                    instance.load(result);
                    // Dispatch Events
                    dispatchEvents(['load']);
                    break;
                default:
                    console.log(operation, result);
            }
        });

        // # Response Error
        socket.on('responseError', function (event, err) {
            console.error(event, err);
        });
    }

    // # Collection
    function collection() {
        //
        var _count = 0;
        var _dataSet = [];
        var _desc = false;
        var _events = {};
        var _index = false;
        var _limit = false;
        var _pagination = {
            current: 0,
            keys: [],
            isNext: false,
            isPrev: false
        };
        var _where = false;
        var _select = false;
        var _startAt = false;

        return{
            api: api,
            load: load,
            getCallback: getCallback,
            getCount: getCount,
            getDataSet: getDataSet,
            getPagination: getPagination,
            handleSpecialOperation: handleSpecialOperation,
            putDataSet: putDataSet
        };

        /*--------------------------------------*/

        // # API
        function api() {
            // Get after 150 ms until all methods are computed
            setTimeout(_get, 150);

            return {
                asc: asc,
                between: between,
                count: count,
                desc: desc,
                equals: equals,
                first: first,
                greaterThan: greaterThan,
                last: last,
                lessThan: lessThan,
                limit: limit,
                on: on,
                put: put,
                select: select,
                startAt: startAt,
                startsWith: startsWith,
                useIndex: useIndex,
            };

            /*--------------------------------------*/

            // # Asc
            function asc() {
                _desc = false;

                return this;
            }

            // # Between
            function between(valueLow, valueHigh) {
                _where = ['~', valueLow, valueHigh];

                return this;
            }

            // # Count, ALIAS for Select = COUNT
            function count() {
                _select = 'COUNT';

                return this;
            }

            // # Desc
            function desc() {
                _desc = true;

                return this;
            }

            // # Equals
            function equals(value) {
                _where = ['=', value];

                return this;
            }

            // # First, ALIAS for Limit and Ascendent
            function first(value) {
                limit(value);
                asc();

                return this;
            }

            // # Greater Than
            function greaterThan(value) {
                _where = ['>=', value];

                return this;
            }

            // # Last, ALIAS for Limit and Descendent
            function last(value) {
                limit(value);
                desc();

                return this;
            }

            // # Less Than
            function lessThan(value) {
                _where = ['<=', value];

                return this;
            }

            // # Limit
            function limit(limit) {
                _limit = limit;

                return this;
            }

            // # On
            function on(event, callback) {
                // Request join
                _request('join');

                _events[event] = callback;

                return this;
            }

            // # Put {add or override}
            function put(set, priority) {
                _insert(set, priority);

                return this;
            }

            // # Select
            function select(select) {
                _select = select;

                return this;
            }

            // # Start At
            function startAt(key) {
                _startAt = key;

                return this;
            }

            // # Starts With
            function startsWith(value) {
                _where = ['^', value];

                return this;
            }

            // # Use Index
            function useIndex(index) {
                // Test if index is defined
                if(indexes.string.indexOf(index) < 0 && indexes.number.indexOf(index) < 0){
                    console.error('The index %s is not defined, the collection won\'t be ordenated or fetched by this index.', index);
                }
                
                _index = index;

                return this;
            }
        }

        // # Get
        function _get(consistent) {
            _request('query', {
                consistent: consistent || false,
                desc: _desc || false,
                index: _index || false,
                limit: _limit || false,
                select: _select || false,
                startAt: _startAt || false,
                where: _where || false
            });
        }

        // # Get Callback {collection always return callback}
        function getCallback(event) {
            return _events[event];
        }

        // # Get Count
        function getCount() {
            return _count;
        }

        // # Get Dataset
        function getDataSet() {
            return _dataSet;
        }

        // # Get Pagination
        function getPagination() {
            return {
                next: _pagination.isNext ? _pageNext : false,
                prev: _pagination.isPrev ? _pagePrev : false
            };
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperation(operation, data) {
            //
            var result = false;

            // Fetch index from dataset
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            // Test if value belongs to actual dataset
            if (dataIndex >= 0) {
                //
                result = {
                    key: data.key
                };

                // Get current data
                var currentData = _dataSet[dataIndex][data.attribute];

                switch (operation) {
                    case 'atomicUpdate':
                        result[data.attribute] = parseInt(currentData) + parseInt(data.value);
                        break
                    case 'pushList':
                        result[data.attribute] = _.uniq(currentData.concat(data.value).sort());
                        break;
                }
            }

            return result;
        }

        // # Insert
        function _insert(set, priority) {
            //
            _request('insert', {
                set: set,
                priority: priority
            });
        }

        // # Load
        function load(collection) {
            _dataSet = collection.data;
            _count = collection.count;

            // Feed pagination Data
            // Set startkeys for the next pagination page 
            var current = _pagination.current;

            if (collection.startKey) {
                _pagination.keys[0] = null; // => required
                _pagination.keys[current + 1] = collection.startKey;
            }

            // Enable / Disable Prev and Next
            var keysLength = _pagination.keys.length - 1;

            _pagination.isPrev = (current <= 0) ? false : true;
            _pagination.isNext = (current >= keysLength) ? false : true;
        }

        // # Page Next
        function _pageNext() {
            //
            if (_pagination.isNext) {
                var keysLength = _pagination.keys.length - 1;

                if (++_pagination.current >= keysLength) {
                    _pagination.current = keysLength;
                }

                // Define Start At
                _startAt = _pagination.keys[_pagination.current];

                // Get again
                _get();
            }
        }

        // # Page Prev
        function _pagePrev() {
            //
            if (_pagination.isPrev) {
                if (--_pagination.current <= 0) {
                    _pagination.current = 0;
                }

                // Define Start At
                _startAt = _pagination.keys[_pagination.current];

                // Get again
                _get();
            }
        }

        // # Put Dataset
        function putDataSet(data) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            if (_testWhere(data)) {
                // Test OK, update data if key already exists, otherwise push
                // (collection.put might add or override)
                if (dataIndex >= 0) {
                    // Update Item
                    _.extend(_dataSet[dataIndex], data);
                } else {
                    // Push Item
                    _dataSet.push(data);
                }

                // Sort and Limit
                _dataSet = _sortAndLimit(_dataSet);
            } else {
                // Test NOT OK, remove data if exists
                if (dataIndex >= 0) {
                    _dataSet.splice(dataIndex, 1);
                }
            }
        }

        // # Sort and Limit
        function _sortAndLimit(data) {
            // Sort
            data = _.sortBy(data, _index || 'key');

            // If desc, reverse array
            if (_desc) {
                data = data.reverse();
            }

            // Limit
            if (_limit) {
                data = data.slice(0, _limit);
            }

            return data;
        }

        // # Test Where Conditions
        function _testWhere(data) {
            // If no where, always pass
            if (!_where) {
                return true;
            }

            var result = false;
            var testCase = _where[0];
            var testValue = _where[1];
            var testAttr = _index || 'key';

            if (_where[2]) {
                testValue = [_where[1], _where[2]];
            }

            switch (testCase) {
                // Between test
                case '~':
                    if (data[testAttr] >= testValue[0] && data[testAttr] <= testValue[1]) {
                        result = true;
                    }
                    break;
                    // Equals test
                case '=':
                    if (data[testAttr] === testValue) {
                        result = true;
                    }
                    break;
                    // Less then test
                case '<=':
                    if (data[testAttr] <= testValue) {
                        result = true;
                    }
                    break;
                    // Greatest then test
                case '>=':
                    if (data[testAttr] >= testValue) {
                        result = true;
                    }
                    break;
                    // Starts with test
                case '^':
                    if (data[testAttr].toLowerCase().indexOf(testValue.toLowerCase()) === 0) {
                        result = true;
                    }
                    break;
            }

            return result;
        }
    }

    // # Dispatch Event
    function dispatchEvents(events) {
        //Fetch dataset
        var dataSet = instance.getDataSet();

        _.each(events, function (event) {
            // Get callback
            var callback = instance.getCallback(event);

            if (callback) {
                if (event === 'load' && isCollection) {
                    // Collection throw dataset, count, and pagination on load
                    var count = instance.getCount();
                    var pagination = instance.getPagination();

                    callback(dataSet, count, pagination);
                } else if (event === 'put') {
                    // When event is put, throw just last transaction data changed
                    callback(lastChangeTransaction);
                } else {
                    // Otherwise throw just dataset
                    callback(dataSet);
                }
            }
        });
    }

    // # Item
    function item() {
        //
        var _dataSet = [];
        var _events = {};
        var _select = addressParams.attribute || false;
        var _where = addressParams.key || false;

        return{
            api: api,
            load: load,
            getCallback: getCallback,
            getDataSet: getDataSet,
            handleSpecialOperation: handleSpecialOperation,
            putDataSet: putDataSet
        };

        /*--------------------------------------*/

        // # API
        function api() {
            // Get after 150 ms until all methods are computed
            setTimeout(_get, 150);

            return{
                decrement: decrement,
                increment: increment,
                pushList: pushList,
                on: on,
                select: select,
                put: put,
                putWithCondition: putWithCondition,
                where: where
            };

            /*--------------------------------------*/

            // # Decrement, ALIAS for -atomicUpdate
            function decrement(value, attribute) {
                _atomicUpdate(-Math.abs(value || 1), attribute);
            }

            // # Increment, ALIAS for +atomicUpdate
            function increment(value, attribute) {
                _atomicUpdate(Math.abs(value || 1), attribute);
            }

            // # Push List
            function pushList(value, attribute) {
                // If no attribute, try get from address params
                attribute = attribute || addressParams.attribute;

                // test if is array
                if (_.isArray(_dataSet[attribute])) {
                    _pushList({
                        attribute: attribute,
                        value: value
                    });
                } else {
                    console.error('You can\'t push into a non LIST attribute.');
                }
            }

            // # On
            function on(event, callback) {
                // Request join
                _request('join');

                _events[event] = callback;

                return this;
            }

            // # Select
            function select(select) {
                _select = select;

                return this;
            }

            // # Put {add or update}
            function put(set, priority) {
                _update(set, priority);

                return this;
            }

            // # Put with Condition
            function putWithCondition(conditionFn, attribute) {
                // Validate function
                if (!_.isFunction(conditionFn)) {
                    console.log('putWithCondition operation must have a callback FUNCTION.');
                }

                // If no attribute, try get from address params
                attribute = attribute || addressParams.attribute;

                // Extend dataset to result, result is gonna be changed if expression evaluates
                var currentData = _.extend({}, _dataSet);
                var result = {};

                // If there is attribute, pass just attribute data, otherwise all data
                var fnResult = attribute ? conditionFn(currentData[attribute] || false) : conditionFn(!_.isEmpty(currentData) ? currentData : false);

                if (fnResult) {
                    // if there is attribute, compute result as a map, otherwise compute all result
                    if (attribute) {
                        result[attribute] = fnResult;
                    } else {
                        result = fnResult;
                    }

                    // Update matching old data with result
                    _update(_.extend(currentData, result));
                } else {
                    console.error('Condition not reached at putWithCondition operation.');
                }
            }

            // # Where
            function where(where) {
                _where = where;

                return this;
            }
        }

        // # Atomic Update
        function _atomicUpdate(value, attribute) {
            // If no attribute, try get from address params
            attribute = attribute || addressParams.attribute;

            // test if is number
            if (_.isNumber(_dataSet[attribute])) {
                _request('atomicUpdate', {
                    set: {
                        attribute: attribute,
                        value: value
                    },
                    where: _where || false
                });
            } else {
                console.error('You can\'t do atomic operations in non NUMBER attribute.');
            }
        }

        // # Get
        function _get(consistent) {
            _request('item', {
                consistent: consistent || false,
                select: _select || false,
                where: _where || false
            });
        }

        // # Get Callback {test if data belongs to item and return callback is exists}
        function getCallback(event) {
            if (_isOwn()) {
                return _events[event];
            }

            return false;
        }

        // # Get Dataset
        function getDataSet() {
            return _dataSet;
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperation(operation, data) {
            if (_isOwn()) {
                //
                var result = {
                    key: data.key
                };

                // Get current data
                var currentData = _dataSet[data.attribute];

                switch (operation) {
                    case 'atomicUpdate':
                        result[data.attribute] = parseInt(currentData) + parseInt(data.value);
                        break
                    case 'pushList':
                        result[data.attribute] = _.uniq(currentData.concat(data.value).sort());
                        break;
                }

                return result;
            }
        }

        // # Is Own {test if a lastChangeTransaction.key belongs to displayed item}
        function _isOwn() {
            return addressParams.key === lastChangeTransaction.key;
        }

        // # Load
        function load(item) {
            _dataSet = item.data;
        }

        // # Push List
        function _pushList(set) {
            _request('pushList', {
                set: set,
                where: _where || false
            });
        }

        // # Put Datset
        function putDataSet(data) {
            if (_isOwn()) {
                // If select, remove extras
                if (_select) {
                    data = _removeNonSelected(data, _select);
                }

                // Update Item
                _.extend(_dataSet, data);
            }
        }

        // # Update
        function _update(set, priority) {
            _request('update', {
                set: set,
                priority: priority,
                where: _where || false
            });
        }
    }

    // # Remove Non Selected
    function _removeNonSelected(data, select) {
        //
        var result = {};

        _.each(data, function (value, key) {
            // If key belong to slect, and different of key
            if (select.indexOf(key) >= 0 || key === 'key') {
                result[key] = value;
            }
        });

        return result;
    }

    // # Request
    function _request(operation, params) {
        // Extend params with namespace and indexes
        params = _.extend(params || {}, {
            address: address,
            indexes: indexes
        });

        // Protection against continuous put operations, time is defined $putOperationInterval
        if (['insert', 'update', 'atomicUpdate'].indexOf(operation) >= 0) {
            var now = +new Date;
            
            if (now - lastPutOperation < putOperationInterval) {
                lastPutOperation = now;
                
                console.error('You might call %s operations once each %s ms.', operation, putOperationInterval);
                return false;
            }
            
            lastPutOperation = now;
        }

        socket.emit('request', operation, params);
    }
}