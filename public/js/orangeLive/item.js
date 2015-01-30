// # Item
orangeLive.prototype.item = function () {
    //
    'use strict';
    
    var self = this;
    var _dataSet = {};
    var _events = {};
    var _select = false;

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
        setTimeout(requestItem, 150);

        return{
            decrement: decrement,
            increment: increment,
            on: on,
            pushList: pushList,
            save: save,
            saveWithCondition: saveWithCondition,
            select: select
        };

        /*--------------------------------------*/

        // # Decrement, ALIAS for -atomicUpdate
        function decrement(attribute, value) {
            requestSpecialUpdate('atomic', attribute, -Math.abs(value || 1));
        }

        // # Increment, ALIAS for +atomicUpdate
        function increment(attribute, value) {
            requestSpecialUpdate('atomic', attribute, Math.abs(value || 1));
        }

        // # On
        function on(event, callback) {
            _events[event] = callback;

            return this;
        }

        // # Push List
        function pushList(attribute, value) {
            requestSpecialUpdate('push', attribute, value);
        }

        // # Save {insert (via update operation) or update}
        function save(set, priority) {
            requestSave(set, priority);

            return this;
        }

        // # Save with Condition
        function saveWithCondition(conditionFn, priority) {
            // Validate function
            if (!_.isFunction(conditionFn)) {
                console.log('saveWithCondition operation must have a callback FUNCTION.');
            }

            // Execute conditionFn and get result
            var fnResult = conditionFn(_dataSet);

            if (fnResult) {
                // Extend result with key
                fnResult = _.extend(fnResult, {
                    key: _dataSet.key
                });

                requestSave(fnResult, priority);
            } else {
                console.error('Condition not reached at saveWithCondition operation.');
            }
        }

        // # Select
        function select(select) {
            _select = select;

            return this;
        }
    }

    // # Get Callback {test if data belongs to item and return callback is exists}
    function getCallback(event) {
        return _events[event];
    }

    // # Get Dataset
    function getDataSet() {
        return self.helpers.formatDataset(_dataSet, requestSave);
    }

    // # Handle special operations like, atomic or push list operations
    function handleSpecialOperation(operation, data) {
        return self.helpers.applySpecialOperation(operation, _dataSet, data);
    }

    // # Load
    function load(item) {
        _dataSet = item.data;
    }

    // # Request Item
    function requestItem(consistent) {
        self.requestsManager.item({
            consistent: consistent || false,
            select: _select
        });
    }

    // # Request Save {insert (via update method) or update)}
    function requestSave(set, priority) {
        // Otherwise update
        self.requestsManager.update({
            priority: priority,
            set: set
        });
    }

    // # Request Special Update
    function requestSpecialUpdate(special, attribute, value) {
        // Resolve path and get current value
        var currentValue = self.helpers.getObjectValue(_dataSet, attribute);

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
        self.requestsManager.update({
            set: set,
            special: special
        });
    }

    // # Save Datset
    function saveDataSet(data) {
        // If select, remove extras
        if (_select) {
            data = self.helpers.removeNonSelected(data, _select);
        }

        // Update Item
        _.extend(_dataSet, data);
    }
};