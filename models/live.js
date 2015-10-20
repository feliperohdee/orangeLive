// # Live Model
var _ = require('lodash');
var Promise = require('bluebird');
var base = require('./base');
var errors = require('errors');
var broadcastModel = require('./broadcast');
var cuid = require('cuid');

module.exports = {
    del: del,
    insert: insert,
    item: item,
    query: query,
    update: update
};

/*----------------------------*/

// # Del Operation
function del(object) {
    return Promise.try(function () {
        // Validations 
        if (!object.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define del object
        return {
            where: {
                _namespace: [object.account, object.table].join('/'),
                _key: object.key
            }
        };
    }).then(function (delObject) {
        // Broadcast Operation
        broadcastModel.publish({
            to: {
                account: object.account,
                table: object.table,
                key: object.key
            },
            data: base.normalizeReponseData(delObject.where),
            operation: 'del'
        });

        return delObject;
    }).then(function (delObject) {
        try {
            return base.del(delObject);
        } catch (err) {
            throw err;
        }
    });
}

// # Insert Operation
function insert(object) {
    return Promise.try(function () {
        // Validations
        // Todo
    }).then(function () {
        // Build Insert object
        return {
            set: _.extend(object.set, {
                _namespace: [object.account, object.table].join('/'),
                _key: '-' + cuid() // Generate new key on insert
            })
        };
    }).then(function (insertObject) {
        // Append priority if exists
        if (_.isNumber(object.priority)) {
            insertObject.set._pi = object.priority;
        }

        return insertObject;
    }).then(function (insertObject) {
        // Encode Indexes
        if (object.indexes) {
            insertObject.set = base.encodeIndexSet(object.indexes, insertObject.set);
        }

        return insertObject;
    }).then(function (insertObject) {
        // Broadcast Operation
        broadcastModel.publish({
            to: {
                account: object.account,
                table: object.table,
                key: object.key
            },
            data: base.normalizeReponseData(insertObject.set),
            operation: 'insert'
        });

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
        // Validations
        if (!object.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define item object
        return {
            where: {
                _namespace: [object.account, object.table].join('/'),
                _key: object.key
            }
        };
    }).then(function (itemObject) {
        // Define Select
        if (object.select) {
            itemObject.select = object.select + ',_key';
        }

        return itemObject;
    }).then(function (itemObject) {
        // Fetch item
        try {
            return base.item(itemObject).then(function (response) {
                response.data = base.normalizeReponseData(response.data);

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
                _namespace: ['=', [object.account, object.table].join('/')]
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
        if (object.indexedBy === 'priority') {
            // Set indexed by
            queryObject.indexedBy = 'priorityIndex';
        } else if (object.indexedBy && object.indexes) {
            // Discover and get Index
            var index = base.discoverIndex(object.indexes, object.indexedBy);
            
            // If no index, throw an error
            if(!index){
                throw new errors.indexError();
            }

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
                itemObject.select = object.select + ',_key';
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
                var alias = base.buildAlias(filter.attribute, filter.value);

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
            return base.query(queryObject);
        } catch (err) {
            throw err;
        }
    }).then(function (response) {
        // Normalize Response
        if (response) {
            response.data = _.map(response.data, function (data) {
                return base.normalizeReponseData(data);
            });

            return response;
        }
    });
}

// # Update Operation
function update(object) {
    return Promise.try(function () {
        // Validations
        if (!object.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define update object
        return {
            set: object.set,
            where: {
                _namespace: [object.account, object.table].join('/'),
                _key: object.key
            }
        };
    }).then(function (updateObject) {
        // Encode Indexes
        if (object.indexes) {
            updateObject.set = base.encodeIndexSet(object.indexes, object.set);
        }

        return updateObject;
    }).then(function (updateObject) {
        // Append priority if exists
        if (_.isNumber(object.priority)) {
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
                    alias = base.buildAlias(_.keys(updateObject.set), _.uniq(_.values(updateObject.set)));

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
                    alias = base.buildAlias(_.keys(updateObject.set), _.uniq([_.values(updateObject.set)])); // <= Array notation is required

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
                case 'removeAttr':
                    // Build Alias
                    alias = base.buildAlias(_.keys(updateObject.set));

                    if (!alias) {
                        throw new Error('Invalid attribute.');
                    }

                    // Build expression and define update param
                    expression = 'REMOVE ' + alias.map.names[0];
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
        // Broadcast Operation
        var operation = 'update' + (object.special ? ':' + object.special : '');
        // Set can be an expression, so, we need treat this
        var data = _.isObject(updateObject.set) ? updateObject.set : object.set;
        // Is important append the key to collections handle data
        data.key = object.key;

        broadcastModel.publish({
            to: {
                account: object.account,
                table: object.table,
                key: object.key
            },
            data: base.normalizeReponseData(data),
            operation: operation
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
