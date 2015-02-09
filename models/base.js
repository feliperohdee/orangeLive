// # Base Model
var _ = require('lodash');
var Promise = require('bluebird');
var cuid = new require('cuid');
var dynamodb = require('../libs').dynamodb;

_createTables();
_createSchema();

module.exports = {
    buildAlias: buildAlias,
    del: del,
    discoverIndex: discoverIndex,
    encodeIndexSet: encodeIndexSet,
    getObjectValue: getObjectValue,
    hasIndexes: hasIndexes,
    insert: insert,
    item: item,
    normalizeReponseData: normalizeReponseData,
    query: query,
    setObjectValue: setObjectValue,
    update: update
};

/*=======================================*/

// # Build Alias
function buildAlias(names, values) {
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

// # Create Schema
function _createSchema() {
    // # Set schema for tblLiveOne
    dynamodb.schema.set('tblLive1')
            .withHash('_namespace as STRING')
            .withRange('_key as STRING');
}

// # Create Tables
function _createTables() {

    var returnData = [];
    var tables = [];

    // # tblLiveOne
    tables.push(dynamodb.table.create('tblLive1')
            .withHash('_namespace as STRING')
            .withRange('_key as STRING')
            .withLocalIndex({
                name: 'priorityIndex',
                attribute: '_pi as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'numberIndex0',
                attribute: '_ni0 as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'numberIndex1',
                attribute: '_ni1 as NUMBER',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'stringIndex0',
                attribute: '_si0 as STRING',
                projection: 'ALL'
            })
            .withLocalIndex({
                name: 'stringIndex1',
                attribute: '_si1 as STRING',
                projection: 'ALL'
            })
            .throughput(10, 10));

    // Each executes in series
    return Promise.each(tables, function (task) {
        return task.exec().then(function (response) {
            returnData.push(response);
        });
    }).then(function () {
        return returnData;
    });
}

// # Del
function del(params) {

    var del = dynamodb.del.item('tblLive1');

    if (params.where)
        del.where(params.where);

    return del.exec();
}

// # Discover Index
function discoverIndex(indexes, index) {
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

// # Has Indexes
function hasIndexes(rules, table) {
    if (rules[table] && rules[table].indexes) {
        return rules[table].indexes;
    }

    return false;
}

// # Encode Index Set
function encodeIndexSet(indexes, set) {
    var result = {};

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

// # Insert
function insert(params) {
    var insert = dynamodb.insert.item('tblLive1');

    if (params.alias)
        insert.alias(params.alias);

    if (params.set)
        insert.set(params.set);

    if (params.withCondition)
        insert.withCondition(params.withCondition);

    return insert.exec();
}

// # Item
function item(params) {
    var item = dynamodb.get.item('tblLive1');

    if (params.alias)
        item.alias(params.alias);

    if (params.select)
        item.select(params.select);

    if (params.where)
        item.where(params.where);

    return item.exec();
}

// # Normalize Response Data
// - Replace _key for key
// - Replace _pi for priority
// - Remove useless data for user
function normalizeReponseData(data) {
    // New reference is required to never influence in another operation
    var _data = _.clone(data);

    if (_data._key) {
        // Replace _key for key
        _data.key = data._key;
    }

    if (_.isNumber(_data._pi)) {
        // Replace _pi for priority
        _data.priority = data._pi;
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

// # Query
function query(params) {
    //
    var query = dynamodb.get.queryItems('tblLive1');

    if (params.alias)
        query.alias(params.alias);

    if (params.consistent)
        query.consistent();

    if (params.desc)
        query.desc();

    if (params.indexedBy)
        query.indexedBy(params.indexedBy);

    if (params.limit)
        query.limit(params.limit);

    if (params.select)
        query.select(params.select);

    if (params.startAt)
        query.startAt(params.startAt);

    if (params.where)
        query.where(params.where);

    if (params.withFilter)
        query.withFilter(params.withFilter);

    return query.exec();
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

// # Update
function update(params) {

    var update = dynamodb.update.item('tblLive1');

    if (params.alias)
        update.alias(params.alias);

    if (params.set)
        update.set(params.set);

    if (params.where)
        update.where(params.where);

    return update.exec();
}