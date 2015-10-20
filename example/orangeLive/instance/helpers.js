// # Orange Live > Instance Helpers
(function () {
    //
    'use strict';
    
    Instance.prototype.helpers = function () {
        //
        return{
            applySpecialOperation: applySpecialOperation,
            formatDataset: formatDataset,
            param: param,
            removeNonSelected: removeNonSelected
        };

        /*=========================*/

        // # Apply Special Operation
        function applySpecialOperation(operation, dataSet, data) {
            //
            var attribute = _.keys(_.omit(data, 'key'))[0];
            var value = data[attribute];

            // Deep dataset clone
            var dataSetClone = _.clone(dataSet, true);
            var currentValue = _.get(dataSetClone, attribute);

            if (!_.isNull(currentValue)) {
                switch (operation) {
                    case 'atomic':
                        var sum = currentValue + value;

                        return _.set(dataSetClone, attribute, sum);
                        break
                    case 'push':
                        var newList = currentValue;
                        newList.push(value);
                        newList = _.uniq(newList.sort());

                        return _.set(dataSetClone, attribute, newList);
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
        function formatDataset(data, saveFn, removeFn) {
            return {
                key: function () {
                    return data.key;
                },
                save: function (set, priority) {
                    // Append key to force update
                    set.key = data.key;

                    saveFn(set, priority);
                },
                update: function (set, priority) {
                    // Merge old data with new data
                    saveFn(_.merge(data, set), priority);
                },
                remove: function () {
                    removeFn(data.key);
                },
                value: function (key) {
                    return key ? _.get(data, key) : _.omit(data, ['key', 'priority']);
                }
            };
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
    };
})();
