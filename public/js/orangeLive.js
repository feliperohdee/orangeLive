// # orangeLive
function orangeLive(address) {
    //
    'use strict';

    var addressParams = {
        key: address.split('/')[2] || false
    };

    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };

    var instance;
    var isCollection = false;

    var socket = io({
        forceNew: true,
        query: 'address=' + address
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
        bindSockets();

        // Expose API
        return _.extend(instance.api(), sharedAPI());
    }

    // # Bind Sockets
    function bindSockets() {
        // # Reponse Success
        socket.on('responseSuccess', function (operation, result) {
            switch (operation) {
                case 'broadcast:insert':
                    // Update Collection Dataset
                    if (isCollection) {
                        instance.saveDataSet(result);
                        // Dispatch Events [fetch, save, save:insert]
                        dispatchEvents(['fetch', 'save', 'save:insert'], result);
                    }
                    break;
                case 'broadcast:update':
                    // Update Collection/Item Dataset
                    instance.saveDataSet(result);
                    // Dispatch Events [fetch, save, save:update]
                    dispatchEvents(['fetch', 'save', 'save:update'], result);
                    break;
                case 'broadcast:update:atomic':
                case 'broadcast:update:push':
                    // Get atomic or push
                    var specialOperation = operation.split(':')[2];
                    var value = instance.handleSpecialOperation(specialOperation, result);

                    if (value) {
                        // Update Collection/Item Dataset
                        instance.saveDataSet(value);
                        // Dispatch Events [fetch, save, save:update]
                        dispatchEvents(['fetch', 'save', 'save:update'], value);
                    }
                    break;
                case 'broadcast:stream':
                    // Dispatch Events
                    dispatchEvents(['stream'], result);
                    break;
                case 'sync:item':
                case 'sync:query':
                    // Load Data
                    instance.load(result);
                    // Dispatch Events
                    dispatchEvents(['load'], result.data);
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
        var _filters = [];
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
            setTimeout(_requestCollection, 150);

            return {
                asc: asc,
                between: between,
                count: count,
                desc: desc,
                equals: equals,
                filter: filter,
                first: first,
                greaterThan: greaterThan,
                last: last,
                lessThan: lessThan,
                limit: limit,
                on: on,
                or: or,
                save: save,
                select: select,
                startAt: startAt,
                startsWith: startsWith,
                where: where
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

            // # Filter
            function filter(attribute, operation, value, or) {
                _filters.push({
                    attribute: attribute,
                    operation: operation,
                    value: value,
                    or: or
                });

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
                request('join');

                _events[event] = callback;

                return this;
            }

            // Or, ALIAS to filter with OR param
            function or(attribute, operation, value) {
                filter(attribute, operation, value, true);

                return this;
            }

            // # Save {insert or update}
            function save(set, priority) {
                //
                _requestSave(set, priority);

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

            // # Where {Define index to be used}
            function where(index) {
                // Test if index is defined
                if (indexes.string.indexOf(index) < 0 && indexes.number.indexOf(index) < 0) {
                    console.error('The index %s is not defined, the collection won\'t be ordenated or fetched by this index.', index);
                }

                _index = index;

                return this;
            }
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

            _.each(_dataSet, function (item) {
                result.push(formatDataset(item, _requestSave));
            });

            return result;
        }

        // # Get Pagination
        function getPagination() {
            return {
                next: _pagination.isNext ? pageNext : false,
                prev: _pagination.isPrev ? pagePrev : false
            };
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperation(operation, data) {
            // Fetch index from dataset
            var dataIndex = _.findIndex(_dataSet, {key: data.key});
            var currentData = _dataSet[dataIndex];

            // Test if value belongs to actual dataset
            if (dataIndex >= 0) {
                //
                return applySpecialOperation(operation, currentData, data);
            }

            return false;
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

        // # Page Prev
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

        // # Request Collection
        function _requestCollection(consistent) {
            requestQuery({
                consistent: consistent || false,
                desc: _desc,
                filters: _filters,
                index: _index,
                limit: _limit,
                select: _select,
                startAt: _startAt,
                where: _where
            });
        }

        // # Save {insert or update}
        function _requestSave(set, priority) {
            // If no key provided, insert
            if (!set.key) {
                // If no key provided, insert
                requestInsert({
                    priority: priority,
                    set: set
                });

                return;
            }

            // Otherwise update
            requestUpdate({
                priority: priority,
                set: set,
                where: set.key
            });
        }

        // # Save Dataset
        function saveDataSet(data) {
            // If select, remove extras
            if (_select) {
                data = removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});

            if (testWhere(data)) {
                // Test OK, update data if key already exists, otherwise push
                // (collection.save might insert or update)
                if (dataIndex >= 0) {
                    // Update Item
                    //console.log(data); // <======== TODO
                    _.extend(_dataSet[dataIndex], data);
                } else {
                    // Push Item
                    _dataSet.push(data);
                }

                // Sort and Limit
                _dataSet = sortAndLimit(_dataSet);
            } else {
                // Test NOT OK, remove data if exists
                if (dataIndex >= 0) {
                    _dataSet.splice(dataIndex, 1);
                }
            }
        }

        // # Sort and Limit
        function sortAndLimit(data) {
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
        function testWhere(data) {
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
    function dispatchEvents(events, data) {
        _.each(events, function (event) {
            // Get callback
            var callback = instance.getCallback(event, data);

            if (callback) {
                switch (event) {
                    case 'load':
                        //Fetch dataset
                        var dataSet = instance.getDataSet();

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
                    case 'stream':
                        // When event is save, throw just last transaction data
                        callback(data);
                        break;
                    default:
                        //Fetch dataset
                        var dataSet = instance.getDataSet();

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
        var _select = false;
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
            setTimeout(_requestItem, 150);

            return{
                decrement: decrement,
                increment: increment,
                on: on,
                pushList: pushList,
                save: save,
                saveWithCondition: saveWithCondition,
                select: select,
                where: where
            };

            /*--------------------------------------*/

            // # Decrement, ALIAS for -atomicUpdate
            function decrement(attribute, value) {
                _requestSpecialUpdate('atomic', attribute, -Math.abs(value || 1));
            }

            // # Increment, ALIAS for +atomicUpdate
            function increment(attribute, value) {
                _requestSpecialUpdate('atomic', attribute, Math.abs(value || 1));
            }

            // # On
            function on(event, callback) {
                // Request join
                request('join');

                _events[event] = callback;

                return this;
            }

            // # Push List
            function pushList(attribute, value) {
                _requestSpecialUpdate('push', attribute, value);
            }

            // # Save {insert (via update operation) or update}
            function save(set, priority) {
                _requestSave(set, priority);

                return this;
            }

            // # Save with Condition
            function saveWithCondition(conditionFn, attribute, priority) {
                // Validate function
                if (!_.isFunction(conditionFn)) {
                    console.log('saveWithCondition operation must have a callback FUNCTION.');
                }

                // If no attribute, try get from _select
                if (!attribute) {
                    attribute = _select;
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
                    _requestSave(_.extend(currentData, result), priority);
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

        // # Get Callback {test if data belongs to item and return callback is exists}
        function getCallback(event, data) {
            if (isOwn(data)) {
                return _events[event];
            }

            return false;
        }

        // # Get Dataset
        function getDataSet() {
            return formatDataset(_dataSet, _requestSave);
        }

        // # Handle special operations like, atomic or push list operations
        function handleSpecialOperation(operation, data) {
            if (isOwn(data)) {
                // Get current data
                var currentData = _.extend({}, _dataSet);

                return applySpecialOperation(operation, currentData, data);
            }
        }

        // # Is Own {test if a key belongs to displayed item}
        function isOwn(data) {
            return addressParams.key === data.key;
        }

        // # Load
        function load(item) {
            _dataSet = item.data;
        }

        // # Request Item
        function _requestItem(consistent) {
            requestItem({
                consistent: consistent,
                select: _select,
                where: _where
            });
        }

        // # Request Save {insert (via update method) or update)}
        function _requestSave(set, priority) {
            // Otherwise update
            requestUpdate({
                priority: priority,
                set: set,
                where: _where
            });
        }

        // # Request Special Update
        function _requestSpecialUpdate(special, attribute, value) {
            // Resolve path and get current value
            var currentValue = getObjectValue(_dataSet, attribute);

            switch (special) {
                case 'atomic':
                    // test if is number
                    if (!_.isNumber(currentValue)) {
                        console.error('You can\'t make atomic operations into a NON number attribute.');
                        return;
                    }
                    break;
                case 'push':
                    // test if is array
                    if (!_.isArray(currentValue)) {
                        console.error('You can\'t push into a non ARRAY attribute.');
                        return;
                    }
                    break;
            }

            // Update set
            var set = {};
            set[attribute] = value;

            // Request update
            requestUpdate({
                set: set,
                special: special,
                where: _where
            });
        }

        // # Save Datset
        function saveDataSet(data) {
            if (isOwn(data)) {
                // If select, remove extras
                if (_select) {
                    data = removeNonSelected(data, _select);
                }

                // Update Item
                _.extend(_dataSet, data);
            }
        }
    }

    // # Apply Special Operation
    function applySpecialOperation(operation, currentData, data) {
        //
        var result = false;
        var attribute = _.keys(_.omit(data, 'key'))[0];
        var value = data[attribute];

        switch (operation) {
            case 'atomic':
                value = getObjectValue(currentData, attribute) + value;

                result = setObjectValue(currentData, attribute, value);
                break
            case 'push':
                // TODO

                result = _.extend(currentData, data, function (currentData, data) {
                    if (_.isArray(currentData) && !_.isArray(data)) {
                        // Push
                        currentData.push(data);
                        // Apply unicity and sort
                        return _.uniq(currentData.sort());
                    }

                    return currentData;
                });
                break;
        }

        return result;
    }

    // # Format Dataset
    function formatDataset(data, saveFn) {
        return {
            key: function () {
                return data.key;
            },
            save: function (set, priority) {
                // Append key to force update
                set.key = data.key;

                saveFn(set, priority);
            },
            value: function (key) {
                return _.omit(key ? data[key] : data, 'key');
            }
        };
    }

    // Fetch value from object with or without dotted path
    function getObjectValue(obj, attribute) {
        if (attribute.indexOf('.') >= 0) {
            // Handle dotted path
            var path = attribute.split('.');

            _.each(path, function (path) {
                obj = !_.isUndefined(obj) ? obj[path] : false;
            });
        } else {
            // Handle simple path
            obj = obj[attribute];
        }

        return obj;
    }

    // Set value to object with or without dotted path
    function setObjectValue(obj, attribute, value) {
        if (attribute.indexOf('.') >= 0) {
            // Handle dotted path
            var i;
            var path = attribute.split('.');
            var reference;

            for (i = 0; i < path.length - 1; i++) {
                reference = obj[path[i]];
            }

            reference[path[i]] = value;
        } else {
            // Handle simple path
            obj[attribute] = value;
        }

        return obj;
    }

    // # Remove Non Selected
    function removeNonSelected(data, select) {
        //
        var result = {};

        // Remove paths
        select = select.split('.')[0];

        _.each(data, function (value, key) {
            // If key belong to slect, and different of key
            if (select.indexOf(key) >= 0 || key === 'key') {
                result[key] = value;
            }
        });

        return result;
    }

    // # Request
    function request(operation, params) {
        // Extend params with namespace and indexes
        params = _.extend(params || {}, {
            indexes: indexes
        });

        socket.emit('request', operation, params);
    }

    // # Request Insert
    function requestInsert(params) {
        request('insert', {
            priority: params.priority,
            set: params.set
        });
    }

    // # Request Item
    function requestItem(params) {
        request('item', {
            consistent: params.consistent,
            select: params.select,
            where: params.where
        });
    }

    // # Request Query
    function requestQuery(params) {
        request('query', {
            consistent: params.consistent,
            desc: params.desc,
            filters: params.filters,
            index: params.index,
            limit: params.limit,
            select: params.select,
            startAt: params.startAt,
            where: params.where
        });
    }

    // # Request Stream
    function requestStream(data) {
        request('stream', data);
    }

    // # Request Update
    function requestUpdate(params) {
        request('update', {
            priority: params.priority,
            set: params.set,
            special: params.special,
            where: params.where
        });
    }

    // # Set Object Value {Resolve path and set value}
    function setObjValue(obj, path, value) {
        path = path.split('.');

        _.each(path, function (path) {
            obj = !_.isUndefined(obj) ? obj[path] : false;
        });

        obj = value;
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
            requestStream({
                data: data
            });
        }
    }
}