// # Orange Live > Instance collection
(function () {
    //
    'use strict';

    Instance.prototype.collection = function () {
        //
        var self = this;
        var _count = 0;
        var _dataSet = [];
        var _desc = false;
        var _events = {};
        var _filters = [];
        var _indexedBy = false;
        var _limit = false;
        var _pagination = {
            current: 0,
            keys: [],
            isNext: false,
            isPrev: false
        };
        var _condition = false;
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
            setTimeout(requestCollection, 150);

            return {
                asc: asc,
                between: between,
                count: count,
                desc: desc,
                equals: equals,
                filter: filter,
                first: first,
                greaterThan: greaterThan,
                indexedBy: indexedBy,
                last: last,
                lessThan: lessThan,
                limit: limit,
                on: on,
                or: or,
                remove: remove,
                save: save,
                select: select,
                startAt: startAt,
                startsWith: startsWith
            };

            /*--------------------------------------*/

            // # Asc
            function asc() {
                _desc = false;

                return this;
            }

            // # Between
            function between(valueLow, valueHigh) {
                _condition = ['~', valueLow, valueHigh];

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
                _condition = ['=', value];

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
                _condition = ['>=', value];

                return this;
            }

            // # Indexed By {Define index to be used}
            function indexedBy(index) {
                _indexedBy = index;

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
                _condition = ['<=', value];

                return this;
            }

            // # Limit
            function limit(limit) {
                _limit = limit;

                return this;
            }

            // # On
            function on(event, callback) {
                _events[event] = callback;

                return this;
            }

            // Or, ALIAS to filter with OR param
            function or(attribute, operation, value) {
                filter(attribute, operation, value, true);

                return this;
            }

            // # Remove
            function remove(key) {
                requestRemove(key);

                return this;
            }

            // # Save {insert or update}
            function save(set, priority) {
                //
                requestSave(set, priority);

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
                _condition = ['^', value];

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
                result.push(self.helpers.formatDataset(item, requestSave, requestRemove));
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

            // Test if value belongs to actual dataset
            if (dataIndex >= 0) {
                return self.helpers.applySpecialOperation(operation, _dataSet[dataIndex], data);
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
                requestCollection();
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
                requestCollection();
            }
        }

        // # Request Collection
        function requestCollection(consistent) {
            self.requestsManager.query({
                consistent: consistent || false,
                condition: _condition,
                desc: _desc,
                filters: _filters,
                indexedBy: _indexedBy,
                limit: _limit,
                select: _select,
                startAt: _startAt
            });
        }

        // # Request Remove
        function requestRemove(key) {
            // Delete
            self.requestsManager.del({
                key: key
            });
        }

        // # Save {insert or update}
        function requestSave(set, priority) {
            // If no key provided, insert
            if (!set.key) {
                // If no key provided, insert
                self.requestsManager.insert({
                    priority: priority,
                    set: set
                });

                return;
            }

            // Otherwise update
            self.requestsManager.update({
                key: set.key,
                priority: priority,
                set: set
            });
        }

        // # Save Dataset
        function saveDataSet(data, mode) {
            // If select, remove extras
            if (_select) {
                data = self.helpers.removeNonSelected(data, _select);
            }

            // Get index
            var dataIndex = _.findIndex(_dataSet, {key: data.key});
            var isRemove = mode === 'remove';
            var isStrict = mode === 'strict';

            // if not remove and pass in condition and filter tests
            if (!isRemove && testCondition(data) && testFilter(data)) {
                // Test OK, update data if key already exists, otherwise push it
                if (dataIndex >= 0) {
                    // Update Item in Collection
                    if (isStrict) {
                        // Replace all data
                        _dataSet[dataIndex] = data;
                    } else {
                        // Just extend old with new data
                        _.extend(_dataSet[dataIndex], data);
                    }
                } else {
                    // Push Item
                    _dataSet.push(data);
                }

                // Sort and Limit
                _dataSet = sortAndLimit(_dataSet);
            } else {
                // Test NOT OK or is remove, remove data
                if (dataIndex >= 0) {
                    _dataSet.splice(dataIndex, 1);
                }
            }
        }

        // # Sort and Limit
        function sortAndLimit(data) {
            // Sort
            data = _.sortByOrder(data, _indexedBy || 'key', _desc ? 'desc' : 'asc');

            // Limit
            if (_limit) {
                data = data.slice(0, _limit);
            }

            return data;
        }

        // # Test Filter Conditions
        function testFilter(data) {
            // If no filter, always pass
            if (!_filters) {
                return true;
            }

            var results = [];

            _.each(_filters, function (filter, index) {
                var testCase = filter.operation;
                var testValue = filter.value;
                var testedValue = _.get(data, filter.attribute);
                var notNull = !_.isNull(testedValue);

                results[index] = {
                    or: !!filter.or
                };

                switch (testCase) {
                    // Attr exists test
                    case 'attrExists':
                        results[index].value = !!testedValue;
                        break;
                        // Attr not exists test
                    case 'attrNotExists':
                        results[index].value = !testedValue;
                        break;
                        // Begins with test
                    case 'beginsWith':
                        results[index].value = !!(notNull && testedValue.toLowerCase().indexOf(testValue.toLowerCase()) === 0);
                        break;
                        // Between test
                    case 'between':
                        results[index].value = !!(notNull && testedValue >= testValue[0] && testedValue <= testValue[1]);
                        break;
                        // Contains test
                    case 'contains':
                        results[index].value = !!(notNull && testedValue.toLowerCase().indexOf(testValue.toLowerCase()) >= 0);
                        break;
                        // Equals test
                    case 'equals':
                        results[index].value = !!(notNull && testedValue === testValue);
                        break;
                        // Greater than test
                    case 'greaterThan':
                        results[index].value = !!(notNull && testedValue >= testValue);
                        break;
                        // Less than test
                    case 'lessThan':
                        results[index].value = !!(notNull && testedValue <= testValue);
                        break;
                        // Not equals test
                    case 'notEquals':
                        results[index].value = !!(notNull && testedValue !== testValue);
                        break;
                }
            });

            // Analyze results
            var isOr = _.some(results, 'or');

            if (isOr) {
                return _.some(results, 'value');
            } else {
                return _.every(results, 'value');
            }
        }

        // # Test Condition Conditions
        function testCondition(data) {
            // If no condition, always pass
            if (!_condition) {
                return true;
            }

            var testCase = _condition[0];
            var testValue = _condition[1];
            //
            if (_condition[2]) {
                testValue = [_condition[1], _condition[2]];
            }

            var testedValue = _.get(data, _indexedBy || 'key');
            var notNull = !_.isNull(testedValue);

            switch (testCase) {
                // Between test
                case '~':
                    if (notNull && testedValue >= testValue[0] && testedValue <= testValue[1]) {
                        return true;
                    }
                    break;
                    // Equals test
                case '=':
                    if (notNull && testedValue === testValue) {
                        return true;
                    }
                    break;
                    // Less then test
                case '<=':
                    if (notNull && testedValue <= testValue) {
                        return true;
                    }
                    break;
                    // Greatest then test
                case '>=':
                    if (notNull && testedValue >= testValue) {
                        return true;
                    }
                    break;
                    // Starts with test
                case '^':
                    if (notNull && testedValue.toLowerCase().indexOf(testValue.toLowerCase()) === 0) {
                        return true;
                    }
                    break;
            }

            return false;
        }
    };
})();
