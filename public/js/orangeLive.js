// # orangeLive
function orangeLive(address) {
    //
    'use strict';

    var addressParams = {
        namespace: address.split('/')[0] || false,
        key: address.split('/')[1] || false,
        attribute: address.split('/')[2] || false
    };
    var socket = io();
    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };
    
    var cInstance = collection();
    var iInstance = item();

    __construct();

    return _factory();

    /*----------------------------*/

    // # Construct
    function __construct() {
        _bindSockets();
    }

    // # Factory
    function _factory() {
        //
        if (!addressParams.key) {
            // Return collection instance
            return cInstance.api();
            // Return item instance
        } else if (!addressParams.attribute) {
            return iInstance.api().key(addressParams.key);
        } else {
            // Return item instance with select attributes
            return iInstance.api().key(addressParams.key).select(addressParams.attribute);
        }
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
        //
        socket.on('responseSuccess', function (operation, result) {
            switch (operation) {
                case 'query':
                    // Update Data set
                    cInstance.setDataSet(result.data);

                    // Feed pagination Data
                    // Set startkeys for the next pagination page
                    var pagination = cInstance.getPagination();
                    var current = pagination.current;

                    if (result.startKey) {
                        pagination.keys[0] = null; // => required
                        pagination.keys[current + 1] = result.startKey;
                    }

                    // Enable / Disable Prev and Next
                    var keysLength = pagination.keys.length - 1

                    pagination.isPrev = (current <= 0) ? false : true;
                    pagination.isNext = (current >= keysLength) ? false : true;

                    // Update pagination data
                    cInstance.setPagination(pagination);

                    _dispatchEvent('collection', 'load', {
                        data: cInstance.getDataSet(),
                        pagination: {
                            prev: pagination.isPrev ? cInstance.pagePrev : false,
                            next: pagination.isNext ? cInstance.pageNext : false
                        }
                    });
                    break;
                case 'insert':
                    _dispatchEvent('collection', 'add', result);
                    _dispatchEvent('collection', 'fetch:add', result);
                    break;
                case 'item':
                    // Update Data set
                    iInstance.setDataSet(result.data);

                    _dispatchEvent('item', 'load', iInstance.getDataSet());
                    break;
                case 'update':
                    _dispatchEvent('collection', 'change', result);
                    _dispatchEvent('collection', 'fetch:change', result);
                    _dispatchEvent('item', 'change', result);
                    break;
                case 'delete':
                    break;
            }
        });

        // ### Response Error
        socket.on('responseError', function (event, err) {
            console.error(event, err);
        });
    }

    // ## Dispatch Event
    function _dispatchEvent(type, event, result) {

        var callback;

        if (type === 'collection') {
            callback = cInstance.getCallback(event);
        } else if (type === 'item') {
            callback = iInstance.getCallback(event);
        }

        if (callback) {
            switch (type + '.' + event) {
                case 'collection.add':
                case 'collection.change':
                    callback(result);
                    break;
                case 'collection.fetch:add':
                    cInstance.insertCollection(result, callback);
                    break;
                case 'collection.fetch:change':
                    cInstance.updateCollection(result, callback);
                    break;
                case 'collection.load':
                    callback(result.data, result.pagination);
                    break;
                case 'item.change':
                    // test if item changed is item displayed, than callback
                    if (iInstance.hasSameKey(result)) {
                        callback(result);
                    }
                    break;
                case 'item.load':
                    callback(result);
                    break;
            }
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

    // # Collection
    function collection() {
        //
        var _dataSet = [];
        var _events = {};
        var _index = false;
        var _limit = false;
        var _pagination = {
            current: 0,
            keys: [],
            isNext: false,
            isPrev: false
        }
        var _query = false;
        var _select = false;
        var _startAt = false;

        return{
            api: api,
            getCallback: getCallback,
            getDataSet: getDataSet,
            getPagination: getPagination,
            insertCollection: insertCollection,
            pageNext: pageNext,
            pagePrev: pagePrev,
            setDataSet: setDataSet,
            setPagination: setPagination,
            updateCollection: updateCollection
        };

        /*--------------------------------------*/

        // ## Get
        function _get(consistent) {
            _request('query', {
                consistent: consistent || false,
                index: _index || false,
                limit: _limit || false,
                query: _query || false,
                select: _select || false,
                startAt: _startAt || false
            });
        }

        // # Insert
        function _insert(data, priority) {
            //
            _request('insert', {
                data: data,
                priority: priority
            });
        }

        // ## Sort and Limit
        function _sortAndLimit(data) {
            // Sort
            if (_index) {
                data = _.sortBy(data, _index || 'key');
            }

            // Limit
            if (_limit) {
                data = data.slice(0, _limit);
            }

            return data;
        }

        // # Test Conditions
        function _testConditions(data) {
            // If no query, always pass
            if (!_query) {
                return true;
            }

            var result = false;
            var testCase = _query[0];
            var testValue = _query[1];
            var testAttr = _index || 'key';

            if (_query[2]) {
                testValue = [_query[1], _query[2]];
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
                between: between,
                equals: equals,
                lessThan: lessThan,
                greatestThan: greatestThan,
                insert: insert,
                limit: limit,
                on: on,
                push: push,
                select: select,
                startAt: startAt,
                startsWith: startsWith,
                useIndex: useIndex,
            };

            /*--------------------------------------*/

            // ## Between
            function between(valueLow, valueHigh) {
                _query = ['~', valueLow, valueHigh];

                return this;
            }

            // ## Equals
            function equals(value) {
                _query = ['=', value];

                return this;
            }

            // ## Less Than
            function lessThan(value) {
                _query = ['<=', value];

                return this;
            }

            // ## Greatest Than
            function greatestThan(value) {
                _query = ['>=', value];

                return this;
            }

            // ## Insert
            function insert(data, priority) {
                _insert(data, priority);

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

            // ## Push
            function push(data, priority) {
                // Push create always create new key
                delete data.key;

                _insert(data, priority);

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
                _query = ['^', value];

                return this;
            }

            // ## Use Index
            function useIndex(index) {
                _index = index;

                return this;
            }
        }

        // ## Get Callback
        function getCallback(event) {
            return _events[event.split(':')[0]]; // Explode second rule if exists
        }

        // ## Get Data
        function getDataSet() {
            return _dataSet;
        }

        // ## Get Pagination
        function getPagination() {
            return _pagination;
        }

        // ## Insert Item into collection
        function insertCollection(data, callback) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }
            
            // Test Conditions
            if (_testConditions(data)) {
                // If pass through condition test, push data
                _dataSet.push(data);

                // Sort and Limit
                _dataSet = _sortAndLimit(_dataSet);
            }

            // Callback
            callback(_dataSet);
        }

        // ## Page Next
        function pageNext() {
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
        function pagePrev() {
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

        // ## Set Data
        function setDataSet(data) {
            _dataSet = data;
        }

        // ## Set Pagination
        function setPagination(data) {
            _.extend(_pagination, data);
        }

        // ## Update Item in Collection
        function updateCollection(data, callback) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            if (_testConditions(data)) {
                // Passed into tests, update data if exists
                if (dataIndex >= 0) {
                    // Update Item
                    _.extend(_dataSet[dataIndex], data);
                } else {
                    // Passed into tests but not belongs to collection yet, insert it
                    _dataSet.push(data);
                }

                // Sort and Limit
                _dataSet = _sortAndLimit(_dataSet);
            } else {
                // If reproved in the test, remove data if exists
                if (dataIndex >= 0) {
                    _dataSet.splice(dataIndex, 1);
                }
            }

            //Callback
            callback(_dataSet);
        }
    }

    // # Item
    function item() {
        //
        var _dataSet = [];
        var _events = {};
        var _key = false;
        var _select = false;

        return{
            api: api,
            hasSameKey: hasSameKey,
            getCallback: getCallback,
            getDataSet: getDataSet,
            setDataSet: setDataSet
        };

        /*--------------------------------------*/

        // ## Get
        function _get(consistent) {
            _request('item', {
                consistent: consistent || false,
                select: _select || false,
                query: _key || false
            });
        }

        // ## Update
        function _update(data, priority) {
            _request('update', {
                data: data,
                priority: priority,
                where: _key || false
            });
        }

        // ## API
        function api() {
            // Get after 150 ms
            setTimeout(_get, 150);

            return{
                on: on,
                key: key,
                push: push,
                select: select,
                update: update,
            };

            /*--------------------------------------*/

            // ## On
            function on(event, callback) {
                // Request join
                _request('join');

                _events[event] = callback;

                return this;
            }

            // ## Key
            function key(key) {
                _key = key;

                return this;
            }

            // ## Push
            function push(attribute, data) {
                //
                var value = {};
                value[attribute] = _dataSet[attribute];

                if (!_.isArray(value[attribute])) {
                    value[attribute] = [];
                }

                value[attribute].push(data);

                _update(value);

                return this;
            }

            // ## Select
            function select(select) {
                _select = select;

                return this;
            }

            // # Update
            function update(data, priority) {
                _update(data, priority);

                return this;
            }
        }

        // ## Has Same Key
        function hasSameKey(data) {
            return _dataSet.key === data.key;
        }

        // ## Get Callback
        function getCallback(event) {
            return _events[event.split(':')[0]]; // Explode second rule if exists
        }

        // ## Get Data
        function getDataSet(data) {
            return _dataSet;
        }

        // ## Set Data
        function setDataSet(data) {
            _dataSet = data;
        }
    }
}