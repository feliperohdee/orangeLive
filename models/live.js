// # Live Model
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var broadcastModel = require('../models/broadcast');
var cuid = new require('cuid');

module.exports = {
    insert: insert,
    item: item,
    query: query,
    update: update
};

/*----------------------------*/

// # Build Alias
function _buildAlias(names, values) {
    //
    var result = {
        data: {},
        map: {}
    };

    if (!names) {
        return false;
    }

    // Names
    result.data.names = {};
    result.map.names = [];

    if (!_.isArray(names)) {
        names = [names];
    }

    // Iterate over names
    _.each(names, function (name, nameIndex) {
        // Split paths from name
        name = name.split('.');

        // Iterate over name do handle path's
        _.each(name, function (value, pathIndex) {
            var id = cuid();
            // Set data.name
            result.data.names[id] = value.trim();

            // Set map.name
            if (pathIndex <= 0) {
                // Path is root, just push name
                result.map.names.push('#' + id);
            } else {
                // It means there is path, then extend map.names[index] with this path
                result.map.names[nameIndex] += '.#' + id;
            }
        });
    });

    // Valus
    if (values) {
        //
        result.data.values = {};
        result.map.values = [];

        if (!_.isArray(values)) {
            values = [values];
        }

        _.each(values, function (value) {
            var id = cuid();
            // Set value
            result.data.values[id] = value;
            // Add on map
            result.map.values.push(':' + id);
        });
    }

    return result;
}

// # Discover Index
function _discoverIndex(indexes, index) {
    //
    var result = false;

    // Discover Index
    var string = indexes.string.indexOf(index);
    var number = indexes.number.indexOf(index);

    if (string >= 0) {
        result = {
            name: 'stringIndex' + string, // stringIndex0 or stringIndex1
            attribute: '_si' + string // _si0 or _si1
        };
    }

    if (number >= 0) {
        result = {
            name: 'numberIndex' + number, // numberIndex0 or numberIndex1
            attribute: '_ni' + number // _ni0 or _ni1
        };
    }

    return result;
}

// # Encode Index Set
function _encodeIndexSet(indexes, set) {
    var result = {};

    // Always delete key
    delete set.key;

    // String Index
    if (indexes.string) {
        _.each(indexes.string, function (attribute, key) {
            if (set[attribute]) { // if set attribute exists
                result['_si' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
            }
        });
    }

    // Number Index
    if (indexes.number) {
        _.each(indexes.number, function (attribute, key) {
            if (set[attribute]) { // if set attribute exists
                result['_ni' + (key % 2)] = set[attribute]; // key % 2 guarantees 0 or 1
            }
        });
    }

    // Match indexes results
    return _.extend(set, result);
}

// # Insert Operation
function insert(object) {
    return Promise.try(function () {
        // Build Insert object
        return {
            set: _.extend(object.set, {
                _namespace: object.namespace,
                _key: '-' + cuid() // Generate new key
            })
        };
    }).then(function (insertObject) {
        // Append priority if exists
        if (object.priority) {
            insertObject.set._pi = object.priority;
        }

        return insertObject;
    }).then(function (insertObject) {
        // Encode Indexes
        if (object.indexes) {
            insertObject.set = _encodeIndexSet(object.indexes, insertObject.set);
        }

        return insertObject;
    }).then(function (insertObject) {
        // Broadcast Operation
        //_sendBroadcast('insert', insertObject.set);

        return insertObject;
    }).then(function (insertObject) {
        // Sync Data
        try {
            return base.insert(insertObject);
        } catch (err) {
            throw err;
        }

    });
}

// # Item Operation
function item(object) {
    return Promise.try(function () {
        // Define item object
        return {
            where: {
                _namespace: object.namespace
            }
        };
    }).then(function (itemObject) {
        // Define default key
        if (object.key) {
            itemObject.where._key = object.key;
        }

        return itemObject;
    }).then(function (itemObject) {
        // Define Select
        if (object.select) {
            // Split comma's, always include _key
            var selectArray = object.select.split(',').concat('_key');

            // Build Alias
            var alias = _buildAlias(selectArray);

            itemObject.alias = alias.data;
            itemObject.select = alias.map.names.join();
        }

        return itemObject;
    }).then(function (itemObject) {
        // Fetch item
        try {
            return base.item(itemObject).then(function (response) {
                response.data = _normalizeReponseData(response.data);

                return response;
            });
        } catch (err) {
            throw err;
        }
    });
}

// # Query Operation
function query(object) {
    return Promise.try(function () {
        // Build initial query object
        return {
            consistent: object.consistent,
            desc: object.desc,
            limit: object.limit,
            startAt: object.startAt,
            where: {
                _namespace: ['=', object.namespace]
            }
        };
    }).then(function (queryObject) {
        // Set default condition if exists
        if (object.condition) {
            queryObject.where._key = object.condition;
        }

        return queryObject;
    }).then(function (queryObject) {
        // Define Indexes
        if (object.indexedBy && object.indexes) {
            // Discover and get Index
            var index = _discoverIndex(object.indexes, object.indexedBy);

            // Set indexed by
            queryObject.indexedBy = index.name;

            // Set condition if exists
            if (object.condition) {
                // Remove default key condition
                delete queryObject.where._key;
                // Append indexed condition
                queryObject.where[index.attribute] = object.condition;
            }
        }

        return queryObject;
    }).then(function (queryObject) {
        // Define Select
        if (object.select) {
            if (object.select === 'COUNT') {
                queryObject.select = 'COUNT';
            } else {
                // Split comma's, always include _key
                var selectArray = object.select.split(',').concat('_key');

                // Build Alias
                var alias = _buildAlias(selectArray);

                queryObject.alias = alias.data;
                queryObject.select = alias.map.names.join();
            }
        }

        return queryObject;
    }).then(function (queryObject) {
        // Define Filter
        if (object.filters && object.filters.length) {
            //
            queryObject.withFilter = '';
            queryObject.alias = queryObject.alias || {};

            _.each(object.filters, function (filter, index) {
                //
                var alias = _buildAlias(filter.attribute, filter.value);

                if (!alias) {
                    throw new Error('Invalid attribute or value.');
                }

                switch (filter.operation) {
                    case 'attrExists':
                        queryObject.withFilter += 'attribute_exists(' + alias.map.names[0] + ')';
                        break;
                    case 'attrNotExists':
                        queryObject.withFilter += 'attribute_not_exists(' + alias.map.names[0] + ')';
                        break;
                    case 'beginsWith':
                        queryObject.withFilter += 'begins_with(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                        break;
                    case 'between':
                        queryObject.withFilter += alias.map.names[0] + ' BETWEEN ' + alias.map.values[0] + ' AND ' + alias.map.values[1];
                        break;
                    case 'contains':
                        queryObject.withFilter += 'contains(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                        break;
                    case 'equals':
                        queryObject.withFilter += alias.map.names[0] + ' = ' + alias.map.values[0];
                        break;
                    case 'greaterThan':
                        queryObject.withFilter += alias.map.names[0] + ' >= ' + alias.map.values[0];
                        break;
                    case 'lessThan':
                        queryObject.withFilter += alias.map.names[0] + ' <= ' + alias.map.values[0];
                        break;
                    case 'notEquals':
                        queryObject.withFilter += alias.map.names[0] + ' <> ' + alias.map.values[0];
                        break;
                }

                // If morte than one filter, get next comparision
                if (index < object.filters.length - 1) {
                    queryObject.withFilter += object.filters[index + 1].or ? ' OR ' : ' AND ';
                }

                // Extend alias names
                if (!_.isEmpty(alias.data.names)) {
                    //
                    if (!queryObject.alias.names) {
                        queryObject.alias.names = {};
                    }

                    _.extend(queryObject.alias.names, alias.data.names);
                }

                // Extend alias values
                if (!_.isEmpty(alias.data.values)) {
                    //
                    if (!queryObject.alias.values) {
                        queryObject.alias.values = {};
                    }

                    _.extend(queryObject.alias.values, alias.data.values);
                }
            });
        }

        return queryObject;
    }).then(function (queryObject) {
        // Fetch query 
        try {
            return base.query(queryObject).then(function (response) {
                if (response) {
                    response.data = _.map(response.data, function (data) {
                        return _normalizeReponseData(data);
                    });

                    return response;
                }
            });
        } catch (err) {
            throw err;
        }
    });
}

// # Normalize Response Data
// - Replace _key for key
// - Remove useless data for user
function _normalizeReponseData(data) {
    // New reference is required to never influence in another operation
    var _data = _.clone(data);

    if (_data._key) {
        // Replace _key for key
        _data.key = data._key;
    }

    delete _data._key;
    delete _data._namespace;
    delete _data._pi; // Priority index
    delete _data._si0; // String index 0
    delete _data._si1; // String index 1
    delete _data._ni0; // Number index 0
    delete _data._ni1; // Number index 1

    return _data;
}

// # Update Operation
function update(object) {
    return Promise.try(function () {
        // Validate 
        if (!object.key) {
            throw new Error('validationError: No valid keys provided. Please specify primary key field.');
        }
    }).then(function () {
        // Define update object
        return {
            set: object.set,
            where: {
                _namespace: object.namespace,
                _key: object.key
            }
        };
    }).then(function (updateObject) {
        // Encode Indexes
        if (object.indexes) {
            updateObject.set = _encodeIndexSet(object.indexes, object.set);
        }

        return updateObject;
    }).then(function (updateObject) {
        // Append priority if exists
        if (object.priority) {
            updateObject.set._pi = object.priority;
        }

        return updateObject;
    }).then(function (updateObject) {
        // If special update operation
        if (object.special) {
            // Build Alias
            var alias;
            var expression;

            switch (object.special) {
                case 'atomic':
                    // Build Alias
                    alias = _buildAlias(_.keys(updateObject.set), _.uniq(_.values(updateObject.set)));

                    if (!alias) {
                        throw new Error('Invalid attribute or value.');
                    }

                    // Build expression and define update param
                    expression = 'SET ' + alias.map.names[0] + ' = ' + alias.map.names[0] + ' + ' + alias.map.values[0];

                    // If index, append expression
                    if (alias.map.names[1]) {
                        expression += ', ' + alias.map.names[1] + ' = ' + alias.map.names[1] + ' + ' + alias.map.values[0];
                    }
                    break;
                case 'push':
                    // Build Alias
                    alias = _buildAlias(_.keys(updateObject.set), _.uniq([_.values(updateObject.set)])); // <= Array notation is required

                    if (!alias) {
                        throw new Error('Invalid attribute or value.');
                    }

                    if (_.isObject(object.set.value)) {
                        // Expression for [{map}]
                        expression = 'SET ' + alias.map.names[0] + ' = list_append(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                    } else {
                        // Expression for SS or NS
                        expression = 'ADD ' + alias.map.names[0] + ' ' + alias.map.values[0];
                    }
                    break;
            }

            // Extend update object with alias, and expression
            _.extend(updateObject, {
                alias: alias.data,
                set: expression
            });
        }

        return updateObject;
    }).then(function (updateObject) {
        // Broadcast Operation {data is extended because other side needs to receive updateObject.where}
        var operation = 'update' + (object.special ? ':' + object.special : '');
        var data = _.extend({}, _.isObject(updateObject.set) ? updateObject.set : object.set, updateObject.where);

        broadcastModel.publish({
            operation: operation,
            namespace: object.namespace,
            key: object.key,
            data: _normalizeReponseData(data)
        });

        return updateObject;
    }).then(function (updateObject) {
        try {
            return base.update(updateObject);
        } catch (err) {
            throw err;
        }
    });
}