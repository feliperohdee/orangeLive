// # orangeLive
function orangeLive(address) {
    //
    'use strict';

    var instance;
    var isItem = false;
    var isCollection = false;
    
    var addressParams = {
        namespace: address.split('/')[0] || false,
        key: address.split('/')[1] || false,
        attribute: address.split('/')[2] || false
    };

    var socket = io({
        forceNew: true
    });

    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };

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
            isItem = true;
        }
        
        // Start sockets
        _bindSockets();
        
        // Expose API
        return instance.api();
    }

    // # Request
    function _request(operation, params) {
        // Extend params with namespace and indexes
        params = _.extend(params || {}, {
            namespace: addressParams.namespace,
            indexes: indexes
        });

        socket.emit('request', operation, params);
    }

    // ## Bind Sockets
    function _bindSockets() {
        // ### Reponse Success
        socket.on('responseSuccess', function (operation, result) {
            switch (operation) {
                case 'broadcast:insert':
                    // Update Collection Dataset
                    if (isCollection) {
                        instance.putDataSet(result);
                        // Dispatch Events
                        dispatchEvents(['put', 'fetch']);
                    }
                    break;
                case 'broadcast:update':
                    if (isCollection) {
                        // Update Collection Dataset
                        instance.putDataSet(result);
                        // Dispatch Events
                        dispatchEvents(['put', 'fetch']);
                    } else if (isItem && instance.isOwn(result)) {
                        // Update Item Dataset
                        instance.putDataset(result);
                        // Dispatch Events
                        dispatchEvents(['put', 'fetch']);
                    }
                    break;
                case 'broadcast:atomicUpdate':
                case 'broadcast:pushList':
                    // Get atomicUpdate or pushList
                    var specialOperation = operation.split(':')[1];
                    var value = instance.handleSpecialOperation(specialOperation, result);

                    if (value) {
                        if (isCollection) {
                            // Update Collection Dataset
                            instance.putDataSet(value);
                            // Dispatch Events
                            dispatchEvents(['fetch']);
                        } else if (isItem && instance.isOwn(result)) {
                            // Update Item Dataset
                            instance.putDataset(value);
                            // Dispatch Events
                            dispatchEvents(['fetch']);
                        }
                    }
                    break;
                case 'sync:item':
                    if (isItem) {
                        // Load Data
                        instance.load(result);
                        // Dispatch Events
                        dispatchEvents(['load']);
                    }
                    break;
                case 'sync:query':
                    if (isCollection) {
                        // Load Data
                        instance.load(result);
                        // Dispatch Events
                        dispatchEvents(['load']);
                    }
                    break;
                default:
                    console.log(operation, result);
            }
        });

        // ### Response Error
        socket.on('responseError', function (event, err) {
            console.error(event, err);
        });
    }

    // ## Dispatch Event
    function dispatchEvents(events) {
        //
        var dataSet = instance.getDataSet();

        _.each(events, function (event) {
            // Get callback
            var callback = instance.getCallback(event);

            if (callback) {
                if (event === 'load' && isCollection) {
                    // Collection throw dataset and pagination on load
                    var pagination = instance.getPagination();

                    callback(dataSet, pagination);
                } else {
                    // Otherwise throw just dataset
                    callback(dataSet);
                }
            }
        });
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

    // # Collection
    function collection() {
        //
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
        }
        var _where = false;
        var _select = false;
        var _startAt = false;

        return{
            api: api,
            load: load,
            getCallback: getCallback,
            getDataSet: getDataSet,
            getPagination: getPagination,
            handleSpecialOperation: handleSpecialOperation,
            putDataSet: putDataSet
        };

        /*--------------------------------------*/

        // ## Get
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

        // # Insert
        function _insert(set, priority) {
            //
            _request('insert', {
                set: set,
                priority: priority
            });
        }

        // ## Page Next
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

        // ## Page Prev
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

        // ## Sort and Limit
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

        // # Test Conditions
        function _testConditions(data) {
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

        // ## API
        function api() {

            // Get after 150 ms
            setTimeout(_get, 150);

            return {
                asc: asc,
                between: between,
                desc: desc,
                equals: equals,
                first: first,
                greatestThan: greatestThan,
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

            // ## Asc
            function asc() {
                _desc = false;

                return this;
            }

            // ## Between
            function between(valueLow, valueHigh) {
                _where = ['~', valueLow, valueHigh];

                return this;
            }

            // ## Desc
            function desc() {
                _desc = true;

                return this;
            }

            // ## Equals
            function equals(value) {
                _where = ['=', value];

                return this;
            }

            // ## First, ALIAS for Limit and Ascendent
            function first(value) {
                limit(value);
                asc();

                return this;
            }

            // ## Greatest Than
            function greatestThan(value) {
                _where = ['>=', value];

                return this;
            }

            // ## Last, ALIAS for Limit and Descendent
            function last(value) {
                limit(value);
                desc();

                return this;
            }

            // ## Less Than
            function lessThan(value) {
                _where = ['<=', value];

                return this;
            }

            // ## Limit
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

            // ## Put
            function put(set, priority) {
                _insert(set, priority);

                return this;
            }

            // ## Select
            function select(select) {
                _select = select;

                return this;
            }

            // ## Start At
            function startAt(key) {
                _startAt = key;

                return this;
            }

            // ## Starts With
            function startsWith(value) {
                _where = ['^', value];

                return this;
            }

            // ## Use Index
            function useIndex(index) {
                _index = index;

                return this;
            }
        }

        // ## Load
        function load(collection) {
            _dataSet = collection.data;

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

        // ## Get Callback
        function getCallback(event) {
            return _events[event];
        }

        // ## Get Dataset
        function getDataSet() {
            return _dataSet;
        }

        // ## Get Pagination
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

                // Get actual Value
                var actualValue = _dataSet[dataIndex][data.attribute];

                switch (operation) {
                    case 'atomicUpdate':
                        result[data.attribute] = parseInt(actualValue) + parseInt(data.value);
                        break
                    case 'pushList':
                        result[data.attribute] = actualValue.concat(data.value);
                        break;
                }
            }

            return result;
        }

        // ## Put Dataset
        function putDataSet(data) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            if (_testConditions(data)) {
                // Test OK, update data if exists, otherwise push
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
            isOwn: isOwn,
            putDataset: putDataset
        };

        /*--------------------------------------*/

        // ## Atomic Update
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

        // ## Get
        function _get(consistent) {
            _request('item', {
                consistent: consistent || false,
                select: _select || false,
                where: _where || false
            });
        }

        // ## Push List
        function _pushList(set) {
            _request('pushList', {
                set: set,
                where: _where || false
            });
        }

        // ## Update
        function _update(set, priority) {
            _request('update', {
                set: set,
                priority: priority,
                where: _where || false
            });
        }

        // ## API
        function api() {
            // Get after 150 ms
            setTimeout(_get, 150);

            return{
                decrement: decrement,
                increment: increment,
                pushList: pushList,
                on: on,
                select: select,
                put: put,
                where: where
            };

            /*--------------------------------------*/

            // ## Decrement, ALIAS for -atomicUpdate
            function decrement(value, attribute) {
                _atomicUpdate(-Math.abs(value || 1), attribute);
            }

            // ## Increment, ALIAS for +atomicUpdate
            function increment(value, attribute) {
                _atomicUpdate(Math.abs(value || 1), attribute);
            }

            // ## Push List
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

            // ## On
            function on(event, callback) {
                // Request join
                _request('join');

                _events[event] = callback;

                return this;
            }

            // ## Select
            function select(select) {
                _select = select;

                return this;
            }

            // # Put
            function put(set, priority) {
                _update(set, priority);

                return this;
            }

            // ## Where
            function where(where) {
                _where = where;

                return this;
            }
        }

        // ## Load
        function load(item) {
            _dataSet = item.data;
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperation(operation, data) {
            //
            var result = {
                key: data.key
            };

            // Get actual Value
            var actualValue = _dataSet[data.attribute];

            switch (operation) {
                case 'atomicUpdate':
                    result[data.attribute] = parseInt(actualValue) + parseInt(data.value);
                    break
                case 'pushList':
                    result[data.attribute] = actualValue.concat(data.value);
                    break;
            }

            return result;
        }

        // ## Get Callback
        function getCallback(event) {
            return _events[event];
        }

        // ## Get Dataset
        function getDataSet() {
            return _dataSet;
        }

        // ## Is Own
        function isOwn(data) {
            return _dataSet.key === data.key;
        }

        // ## Put Datset
        function putDataset(data) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Update Item
            _.extend(_dataSet, data);
        }
    }
}