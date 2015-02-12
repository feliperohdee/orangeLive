// # Orange Live > Instance Helpers
(function () {
    //
    'use strict';
    
    var Instance = OrangeLive.prototype.Instance;
    
    Instance.prototype.helpers = function () {
        //
        return{
            applySpecialOperation: applySpecialOperation,
            formatDataset: formatDataset,
            getObjectValue: getObjectValue,
            param: param,
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
                    case 'removeAttr':
                        delete dataSetClone[attribute];
                        return dataSetClone;
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
                    return key ? getObjectValue(data, key) : _.omit(data, ['key', 'priority']);
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

                    // Important test undefined, because 0 might be false
                    if (_.isUndefined(obj[shift])) {
                        return null;
                    }

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

        // # Param
        function param(obj) {
            var prefix;
            var result = [];
            var add = function (key, value) {
                value = value || "";
                result[result.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            };

            // If an array was passed in, assume that it is an array of form elements.
            if (_.isArray(obj) || (!_.isPlainObject(obj))) {
                // Serialize the form elements
                _.each(obj, function (obj) {
                    add(obj.name, obj.value);
                });

            } else {
                // encode params recursively.
                for (prefix in obj) {
                    paramsBuilder(prefix, obj[ prefix ], add);
                }
            }

            // Return the resulting serialization
            return result.join("&").replace(/%20/g, "+");
        }

        // # Params Builder
        function paramsBuilder(prefix, obj, add) {
            var name;

            if (_.isArray(obj)) {
                // Serialize array item.
                _.each(obj, function (index, value) {
                    if (/\[\]$/.test(prefix)) {
                        // Treat each array item as a scalar.
                        add(prefix, value);
                    } else {
                        // Item is non-scalar (array or object), encode its numeric index.
                        paramsBuilder(prefix + "[" + (_.isObject(value) ? index : "") + "]", value, add);
                    }
                });

            } else if (_.isObject(obj)) {
                // Serialize object item.
                for (name in obj) {
                    paramsBuilder(prefix + "[" + name + "]", obj[ name ], add);
                }
            } else {
                // Serialize scalar item.
                add(prefix, obj);
            }
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
})();