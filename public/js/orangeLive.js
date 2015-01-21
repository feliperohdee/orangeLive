// # orangeLive
function orangeLive(address) {
    //
    'use strict';

    var addressParams = {
        namespace: address.split('/')[0] || false,
        key: address.split('/')[1] || false,
        attribute: address.split('/')[2] || false
    };

    var socket = new io({
        forceNew: true
    });

    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };

    var cInstance = collection();
    var iInstance = item();

    return __construct();

    /*----------------------------*/

    // # Construct
    function __construct() {
        // Start sockets
        _bindSockets();

        if (!addressParams.key) {
            // Return collection instance
            return cInstance.api();
            // Return item instance
        } else {
            // Return item instance with select attributes
            return iInstance.api();
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
                case 'delete':
                    break;
                case 'broadcast:insert':
                    _dispatchEvent('collection', 'add', result);
                    _dispatchEvent('collection', 'fetch:add', result);
                    break;
                case 'broadcast:update':
                    _dispatchEvent('collection', 'change', result);
                    _dispatchEvent('collection', 'fetch:change', result);
                    _dispatchEvent('item', 'change', result);
                    _dispatchEvent('item', 'fetch:change', result);
                    break;
                case 'broadcast:updateAtomic':
                    _dispatchEvent('collection', 'fetch:atomic', result);
                    _dispatchEvent('item', 'fetch:atomic', result);
                    break;
                case 'broadcast:pushList':
                    _dispatchEvent('collection', 'fetch:pushList', result);
                    _dispatchEvent('item', 'fetch:pushList', result);
                    break;
                case 'sync:item':
                    // Update Data set
                    iInstance.setDataSet(result.data);

                    _dispatchEvent('item', 'load', iInstance.getDataSet());
                    break;
                case 'sync:query':
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
                case 'collection.fetch:change':
                    cInstance.updateCollection(result, callback);
                    break;
                case 'collection.fetch:atomic':
                    var atomic = cInstance.handleSpecialOperations('atomic', result);

                    if (atomic) {
                        cInstance.updateCollection(atomic, callback);
                    }
                    break;
                case 'collection.fetch:pushList':
                    var pushed = cInstance.handleSpecialOperations('pushList', result);

                    if (pushed) {
                        cInstance.updateCollection(pushed, callback);
                    }
                    break;
                case 'collection.load':
                    callback(result.data, result.pagination);
                    break;
                case 'item.change':
                    // test if item changed is item displayed, than callback
                    if (iInstance.isOwnData(result)) {
                        callback(result);
                    }
                    break;
                case 'item.fetch:atomic':
                    // test if item changed is item displayed and has atomicity, than callback
                    var atomic = iInstance.handleSpecialOperations('atomic', result);

                    if (iInstance.isOwnData(result) && atomic) {
                        iInstance.updateItem(atomic, callback);
                    }
                    break;
                case 'item.fetch:change':
                    // test if item changed is item displayed, than callback
                    if (iInstance.isOwnData(result)) {
                        iInstance.updateItem(result, callback);
                    }
                    break;
                case 'item.fetch:pushList':
                    // test if item changed is item displayed and has list, than callback
                    var pushed = iInstance.handleSpecialOperations('pushList', result);

                    if (iInstance.isOwnData(result) && pushed) {
                        iInstance.updateItem(pushed, callback);
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
            getCallback: getCallback,
            getDataSet: getDataSet,
            getPagination: getPagination,
            handleSpecialOperations: handleSpecialOperations,
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
                insert: insert,
                last: last,
                lessThan: lessThan,
                limit: limit,
                on: on,
                push: push,
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

            // ## Insert
            function insert(set, priority) {
                _insert(set, priority);

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

            // ## Push
            function push(set, priority) {
                // Push always create new key, so delete it
                delete set.key;

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

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperations(operation, data) {
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
                    case 'atomic':
                        result[data.attribute] = parseInt(actualValue) + parseInt(data.value);
                        break
                    case 'pushList':
                        result[data.attribute] = actualValue.concat(data.value);
                        break;
                }
            }

            return result;
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

        // ## Update Collection
        function updateCollection(data, callback) {
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

            //Callback
            callback(_dataSet);
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
            getCallback: getCallback,
            getDataSet: getDataSet,
            handleSpecialOperations: handleSpecialOperations,
            isOwnData: isOwnData,
            setDataSet: setDataSet,
            updateItem: updateItem
        };

        /*--------------------------------------*/

        // ## Get
        function _get(consistent) {
            _request('item', {
                consistent: consistent || false,
                select: _select || false,
                where: _where || false
            });
        }

        // ## Atomic Update
        function _updateAtomic(set) {
            _request('updateAtomic', {
                set: set,
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
                update: update,
                updateAtomic: updateAtomic,
                where: where
            };

            /*--------------------------------------*/

            // ## Decrement, ALIAS for -updateAtomic
            function decrement(value, attribute) {
                updateAtomic(-Math.abs(value || 1), attribute);
            }

            // ## Increment, ALIAS for +updateAtomic
            function increment(value, attribute) {
                updateAtomic(Math.abs(value || 1), attribute);
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

            // # Update
            function update(set, priority) {
                _update(set, priority);

                return this;
            }

            // ## Update Atomic
            function updateAtomic(value, attribute) {
                // If no attribute, try get from address params
                attribute = attribute || addressParams.attribute;

                // test if is number, or empty
                if (_.isNumber(_dataSet[attribute])) {
                    _updateAtomic({
                        attribute: attribute,
                        value: value
                    });
                } else {
                    console.error('You can\'t do atomic operations in non NUMBER attribute.');
                }
            }

            // ## Where
            function where(where) {
                _where = where;

                return this;
            }
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperations(operation, data) {
            //
            var result = {
                key: data.key
            };

            // Get actual Value
            var actualValue = _dataSet[data.attribute];

            switch (operation) {
                case 'atomic':
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
            return _events[event.split(':')[0]]; // Explode second rule if exists
        }

        // ## Get Data
        function getDataSet() {
            return _dataSet;
        }

        // ## Has Same Key
        function isOwnData(data) {
            return _dataSet.key === data.key;
        }

        // ## Set Data
        function setDataSet(data) {
            _dataSet = data;
        }

        // ## Update Item
        function updateItem(data, callback) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Update Item
            _.extend(_dataSet, data);

            //Callback
            callback(_dataSet);
        }
    }
}