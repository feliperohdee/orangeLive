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
    var lastStream = false;

    var socket = io({
        forceNew: true
    });

    var timers = {
        lastOperation: 0,
        operationRateLimit: 100
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
        }

        // Start sockets
        _bindSockets();

        // Expose API
        return _.extend(instance.api(), sharedAPI());
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
                        instance.saveDataSet(result);
                        // Dispatch Events [fetch, save, save:insert]
                        dispatchEvents(['fetch', 'save', 'save:insert']);
                    }
                    break;
                case 'broadcast:update':
                    // Set last change transaction
                    lastChangeTransaction = result;
                    // Update Collection/Item Dataset
                    instance.saveDataSet(result);
                    // Dispatch Events [fetch, save, save:update]
                    dispatchEvents(['fetch', 'save', 'save:update']);
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
                        instance.saveDataSet(value);
                        // Dispatch Events [fetch, save, save:update]
                        dispatchEvents(['fetch', 'save', 'save:update']);
                    }
                    break;
                case 'broadcast:stream':
                    // Set last stream
                    lastStream = result;
                    // Dispatch Events
                    dispatchEvents(['stream']);
                    break;
                case 'sync:item':
                case 'sync:query':
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
            getCallback: getCallback,
            getCount: getCount,
            getDataSet: getDataSet,
            getPagination: getPagination,
            handleSpecialOperation: handleSpecialOperation,
            load: load,
            saveDataSet: saveDataSet
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
                save: save,
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

            // # Save {insert or update}
            function save(set, priority) {
                //
                _save(set, priority);

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
                if (indexes.string.indexOf(index) < 0 && indexes.number.indexOf(index) < 0) {
                    console.error('The index %s is not defined, the collection won\'t be ordenated or fetched by this index.', index);
                }

                _index = index;

                return this;
            }
        }

        // # Get
        function _get(consistent) {
            _requestQuery({
                consistent: consistent,
                desc: _desc,
                index: _index,
                limit: _limit,
                select: _select,
                startAt: _startAt,
                where: _where
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

        // # Get Dataset {apply methods to each data}
        function getDataSet() {
            //
            var result = [];

            _.each(_dataSet, function (value) {
                // store key and delete ir from value
                result.push({
                    key: function () {
                        return value.key;
                    },
                    save: function (set, priority) {
                        // Append key to force update
                        set.key = value.key;

                        _save(set, priority);
                    },
                    value: function (key) {
                        // extend and remove key
                        var extValue = _.extend({}, value);
                        delete extValue.key;

                        return key ? extValue[key] : extValue;
                    }
                });
            });

            return result;
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

        // # Save Dataset
        function saveDataSet(data) {
            // If select, remove extras
            if (_select) {
                data = _removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            if (_testWhere(data)) {
                // Test OK, update data if key already exists, otherwise push
                // (collection.save might insert or update)
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

        // # Save {insert or update}
        function _save(set, priority) {
            //
            var saveData = {
                priority: priority,
                set: set
            };

            // If no key provided, insert
            if (!set.key) {
                // If no key provided, insert
                _requestInsert(saveData);
                return;
            }

            // Otherwise update
            _requestUpdate(_.extend(saveData, {
                where: set.key
            }));
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
                switch (event) {
                    case 'load':
                        if (isCollection) {
                            // Collection throw dataset, count, and pagination on load
                            var count = instance.getCount();
                            var pagination = instance.getPagination();

                            callback(dataSet, count, pagination);
                        } else {
                            // Otherwise throw just dataset
                            callback(dataSet);
                        }
                        break;
                    case 'save':
                    case 'save:insert':
                    case 'save:update':
                        // When event is save, throw just last transaction data changed
                        callback(lastChangeTransaction);
                        break;
                    case 'stream':
                        // Throw just stream data
                        callback(lastStream);
                        break;
                    default:
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
        var _select = addressParams.attribute;
        var _where = addressParams.key;

        return{
            api: api,
            load: load,
            getCallback: getCallback,
            getDataSet: getDataSet,
            handleSpecialOperation: handleSpecialOperation,
            saveDataSet: saveDataSet
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
                save: save,
                saveWithCondition: saveWithCondition,
                select: select,
                where: where
            };

            /*--------------------------------------*/

            // # Decrement, ALIAS for -atomicUpdate
            function decrement(value, attribute) {
                _atomicUpdate(-Math.abs(value || 1), attribute);
            }

            // # Get
            function _get(consistent) {
                _requestItem({
                    consistent: consistent,
                    select: _select,
                    where: _where
                });
            }

            // # Increment, ALIAS for +atomicUpdate
            function increment(value, attribute) {
                _atomicUpdate(Math.abs(value || 1), attribute);
            }

            // # Push List
            function pushList(value, attribute) {
                // If no attribute, try get from address params
                if (!attribute) {
                    attribute = addressParams.attribute;
                }

                // test if is array
                if (_.isArray(_dataSet[attribute])) {
                    _requestPushList({
                        set: {
                            attribute: attribute,
                            value: value
                        },
                        where: _where
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

            // # Save {insert (via update operation) or update}
            function save(set, priority) {
                _save(set, priority);

                return this;
            }

            // # Save with Condition
            function saveWithCondition(conditionFn, attribute, priority) {
                // Validate function
                if (!_.isFunction(conditionFn)) {
                    console.log('saveWithCondition operation must have a callback FUNCTION.');
                }

                // If no attribute, try get from address params
                if (!attribute) {
                    attribute = addressParams.attribute;
                }

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

                    // Save matching old data with result
                    _save(_.extend(currentData, result), priority);
                } else {
                    console.error('Condition not reached at saveWithCondition operation.');
                }
            }

            // # Select
            function select(select) {
                _select = select;

                return this;
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
            if (!attribute) {
                attribute = addressParams.attribute;
            }

            // test if is number
            if (_.isNumber(_dataSet[attribute])) {
                _requestAtomicUpdate({
                    set: {
                        attribute: attribute,
                        value: value
                    },
                    where: _where
                });
            } else {
                console.error('You can\'t do atomic operations in non NUMBER attribute.');
            }
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
            return {
                key: function () {
                    return _dataSet.key;
                },
                save: function (set, priority) {
                    _save(set, priority);
                },
                value: function (key) {
                    // extend and remove key
                    var extValue = _.extend({}, _dataSet);
                    delete extValue.key;

                    return key ? extValue[key] : extValue;
                }
            };
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
            //
            if (lastChangeTransaction) {
                return addressParams.key === lastChangeTransaction.key;
            }

            return addressParams.key === _dataSet.key;
        }

        // # Load
        function load(item) {
            _dataSet = item.data;
        }

        // # Save {insert (via update method) or update)}
        function _save(set, priority) {
            // Otherwise update
            _requestUpdate({
                priority: priority,
                set: set,
                where: _where
            });
        }

        // # Save Datset
        function saveDataSet(data) {
            if (_isOwn()) {
                // If select, remove extras
                if (_select) {
                    data = _removeNonSelected(data, _select);
                }

                // Update Item
                _.extend(_dataSet, data);
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

    // # Request
    function _request(operation, params) {
        // Extend params with namespace and indexes
        params = _.extend(params || {}, {
            address: address,
            indexes: indexes
        });

        // Validate requests to avoid consecutive heavy operations
        if (_requestValidation(operation)) {
            socket.emit('request', operation, params);
        }
    }

    // # Protects against continuous requests
    function _requestValidation(operation) {
        //
        var now = +new Date;
        var valid = !!(now - timers.lastOperation > timers.operationRateLimit);

        // Exceptions
        switch (operation) {
            case 'join':
            case 'stream':
                // Always valid
                return true
                break;
        }

        // Store last operation timestamp
        timers.lastOperation = now;

        // Throw message error
        if (!valid) {
            console.error('You might call %s operations once each %s ms.', operation, timers.operationRateLimit);
        }

        return valid;
    }

    // # Request Atomic Update
    function _requestAtomicUpdate(params) {
        _request('atomicUpdate', {
            set: params.set,
            where: params.where
        });
    }

    // # Request Insert
    function _requestInsert(params) {
        _request('insert', {
            priority: params.priority,
            set: params.set
        });
    }

    // # Request Item
    function _requestItem(params) {
        _request('item', {
            consistent: params.consistent,
            select: params.select,
            where: params.where
        });
    }

    // # Request Push List
    function _requestPushList(params) {
        _request('pushList', {
            set: params.set,
            where: params.where
        });
    }

    // # Request Query
    function _requestQuery(params) {
        _request('query', {
            consistent: params.consistent,
            desc: params.desc,
            index: params.index,
            limit: params.limit,
            select: params.select,
            startAt: params.startAt,
            where: params.where
        });
    }

    // # Request Stream
    function _requestStream(data) {
        _request('stream', data);
    }

    // # Request Update
    function _requestUpdate(params) {
        _request('update', {
            priority: params.priority,
            set: params.set,
            where: params.where
        });
    }

    // Shared API either item and collection
    function sharedAPI() {
        //
        return{
            stream: stream
        };

        /*----------------------------*/

        // # Stream
        function stream(data) {
            //
            _requestStream({
                data: data
            });
        }
    }
}