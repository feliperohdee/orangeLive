// # Helpers
orangeLive.prototype.helpers = function () {
    //
    return{
        applySpecialOperation: applySpecialOperation,
        formatDataset: formatDataset,
        getObjectValue: getObjectValue,
        removeNonSelected: removeNonSelected,
        setObjectValue: setObjectValue
    };

    /*=========================*/

    // # Apply Special Operation
    function applySpecialOperation(operation, dataSet, data) {
        //
        var attribute = _.keys(_.omit(data, 'key'))[0];
        var value = data[attribute];

        // Deep dataset clone
        var dataSetClone = _.clone(dataSet, true);
        var currentValue = getObjectValue(dataSetClone, attribute);

        if (!_.isNull(currentValue)) {
            switch (operation) {
                case 'atomic':
                    var sum = currentValue + value;

                    return setObjectValue(dataSetClone, attribute, sum);
                    break
                case 'push':
                    var newList = currentValue;
                    newList.push(value);
                    newList = _.uniq(newList.sort());

                    return setObjectValue(dataSetClone, attribute, newList);
                    break;
            }
        }

        return false;
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
                return key ? getObjectValue(data, key) : _.omit(data, 'key');
            }
        };
    }

    // Fetch value from object with or without dotted path
    function getObjectValue(obj, attribute) {
        if (attribute.indexOf('.') >= 0) {
            // Handle dotted path
            var path = attribute.split('.');

            while (path.length > 0) {
                var shift = path.shift();

                if (_.isUndefined(obj[shift])) {
                    return null;
                }

                // Important test undefined, because 0 might be false
                obj = obj[shift];
            }
        } else {
            // Handle simple path
            if (_.isUndefined(obj[attribute])) {
                return null;
            }

            obj = obj[attribute];
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

    // Set value to object with or without dotted path
    function setObjectValue(obj, attribute, value) {
        // Reference to return
        var reference = obj;

        if (attribute.indexOf('.') >= 0) {
            // Handle dotted path
            var path = attribute.split('.');

            while (path.length > 1) {
                var shift = path.shift();

                // If not exists, create it
                if (!obj[shift]) {
                    obj[shift] = {};
                }

                obj = obj[shift];
            }

            obj[path.shift()] = value;
        } else {
            // Handle simple path
            obj[attribute] = value;
        }

        return reference;
    }
};