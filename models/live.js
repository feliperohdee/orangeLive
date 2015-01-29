// # DynamoDb Live
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var cuid = new require('cuid');

module.exports = {
    item: item,
    query: query
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

// # Item Operation
function item(object) {
    return Promise.try(function () {
        // Define item object
        return {
            where: {
                _namespace: object.namespace
            }
        };
    }).then(function (itemParams) {
        // Define default where
        if (object.where) {
            itemParams.where._key = object.where;
        }

        return itemParams;
    }).then(function (itemParams) {
        // Define Select
        if (object.select) {
            // Split comma's, always include _key
            var selectArray = object.select.split(',').concat('_key');

            // Build Alias
            var alias = _buildAlias(selectArray);

            itemParams.alias = alias.data;
            itemParams.select = alias.map.names.join();
        }

        return itemParams;
    }).then(function (itemParams) {
        // Fetch item
        try {
            return base.item(itemParams).then(function (result) {
                result.data = _normalizeReponseData(result.data);

                return result;
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
    }).then(function (queryParams) {
        // Set default where if exists
        if (object.where) {
            queryParams.where._key = object.where;
        }

        return queryParams;
    }).then(function (queryParams) {
        // Define Select
        if (object.select) {
            if (object.select === 'COUNT') {
                queryParams.select = 'COUNT';
            } else {
                // Split comma's, always include _key
                var selectArray = object.select.split(',').concat('_key');

                // Build Alias
                var alias = _buildAlias(selectArray);

                queryParams.alias = alias.data;
                queryParams.select = alias.map.names.join();
            }
        }

        return queryParams;
    }).then(function (queryParams) {
        // Define Filter
        if (object.filters && object.filters.length) {
            //
            queryParams.withFilter = '';
            queryParams.alias = queryParams.alias || {};

            _.each(object.filters, function (filter, index) {
                //
                var alias = _buildAlias(filter.attribute, filter.value);

                if (!alias) {
                    throw new Error('Invalid attribute or value.');
                }

                switch (filter.operation) {
                    case 'attrExists':
                        queryParams.withFilter += 'attribute_exists(' + alias.map.names[0] + ')';
                        break;
                    case 'attrNotExists':
                        queryParams.withFilter += 'attribute_not_exists(' + alias.map.names[0] + ')';
                        break;
                    case 'beginsWith':
                        queryParams.withFilter += 'begins_with(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                        break;
                    case 'between':
                        queryParams.withFilter += alias.map.names[0] + ' BETWEEN ' + alias.map.values[0] + ' AND ' + alias.map.values[1];
                        break;
                    case 'contains':
                        queryParams.withFilter += 'contains(' + alias.map.names[0] + ', ' + alias.map.values[0] + ')';
                        break;
                    case 'equals':
                        queryParams.withFilter += alias.map.names[0] + ' = ' + alias.map.values[0];
                        break;
                    case 'greaterThan':
                        queryParams.withFilter += alias.map.names[0] + ' >= ' + alias.map.values[0];
                        break;
                    case 'lessThan':
                        queryParams.withFilter += alias.map.names[0] + ' <= ' + alias.map.values[0];
                        break;
                    case 'notEquals':
                        queryParams.withFilter += alias.map.names[0] + ' <> ' + alias.map.values[0];
                        break;
                }

                // If morte than one filter, get next comparision
                if (index < object.filters.length - 1) {
                    queryParams.withFilter += object.filters[index + 1].or ? ' OR ' : ' AND ';
                }

                // Extend alias names
                if (!_.isEmpty(alias.data.names)) {
                    //
                    if (!queryParams.alias.names) {
                        queryParams.alias.names = {};
                    }

                    _.extend(queryParams.alias.names, alias.data.names);
                }

                // Extend alias values
                if (!_.isEmpty(alias.data.values)) {
                    //
                    if (!queryParams.alias.values) {
                        queryParams.alias.values = {};
                    }

                    _.extend(queryParams.alias.values, alias.data.values);
                }
            });
        }

        return queryParams;
    }).then(function (queryParams) {
        // Define Indexes
        if (object.index && object.indexes) {
            // Discover and get Index
            var index = _discoverIndex(object.indexes, object.index);

            // Set indexed by
            queryParams.indexedBy = index.name;

            // Set where if exists
            if (object.where) {
                // Remove default key where
                delete queryParams.where._key;
                // Append indexed where
                queryParams.where[index.attribute] = object.where;
            }
        }

        return queryParams;
    }).then(function (queryParams) {
        // Fetch query 
        try {
            return base.query(queryParams).then(function (result) {
                if (result) {
                    result.data = _.map(result.data, function (data) {
                        return _normalizeReponseData(data);
                    });

                    return result;
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