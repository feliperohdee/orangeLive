// # Evaluator Model
var base = require('./base');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = Evaluator;

/*===============================*/

// # Evaluator Constructor
function Evaluator(params) {
    var self = this;

    self.data = params.data || false;
    self.account = params.account || false;
    self.auth = params.auth || false;
}

// # Attr Logic
Evaluator.prototype._attr = function (attr) {
    var self = this;

    // Split attr to append into params
    attr = attr.split('/');

    // Build params with attr splitted
    var params = {
        account: self.account,
        table: attr[0],
        key: attr[1],
        select: attr[2] || false
    };

    return Promise.try(function () {
        // Validations
        if (!params.table) {
            throw new errors.missingTableError();
        }

        if (!params.key) {
            throw new errors.missingKeyError();
        }
    }).then(function () {
        // Define item object
        return {
            where: {
                _namespace: [params.account, params.table].join('/'),
                _key: params.key
            }
        };
    }).then(function (itemObject) {
        // Define Select
        if (!params.select) {
            params.select = '_key';
        }

        // Split comma's, and build alias
        var selectArray = params.select.split(',');
        var alias = base.buildAlias(selectArray);

        itemObject.alias = alias.data;
        itemObject.select = alias.map.names.join();

        return itemObject;
    }).then(function (itemObject) {
        // Fetch item
        try {
            return base.item(itemObject).then(function (response) {
                //
                response = base.getObjectValue(response.data, params.select);

                // Wrap string with comma
                if (_.isString(response)) {
                    response = '\'' + response + '\'';
                }

                return response;
            });
        } catch (err) {
            throw err;
        }
    }).catch(function (e) {
        //console.log(e.message);
    });
};

// # Schema Validator :contains
Evaluator.prototype.contains = function (cnValue, value) {
    return _.contains(cnValue, value);
};

// # Schema Validator :exists
Evaluator.prototype.exists = function (value) {
    if (_.isObject(value) || _.isArray(value)) {
        return !_.isEmpty(value);
    }

    return !_.isUndefined(value) && !_.isNull(value);
};

// # Seek for async codes {attr}
Evaluator.prototype._isAsyncCode = function (code) {
    if (_.isString(code)) {
        return code.match(/attr\(['"][^\(\)]+['"]\)/g);
    }

    return false;
};

// # Schema Validator :boolean
Evaluator.prototype.isBoolean = function (value) {
    return _.isBoolean(value);
};

// # Schema Validator :equals
Evaluator.prototype.isEquals = function (value, eqValue) {
    return value === eqValue;
};

// # Schema Validator :number
Evaluator.prototype.isNumber = function (value) {
    return _.isNumber(value);
};

// # Schema Validator :string
Evaluator.prototype.isString = function (value) {
    return _.isString(value);
};

// # Schema Validator :now
Evaluator.prototype.now = function () {
    return +new Date;
};

// # Parse
Evaluator.prototype.parse = function (code) {
    // Seek for async functions
    var self = this;
    var asyncCodes = self._isAsyncCode(code);

    return Promise.try(function () {
        // Try resolve async functions
        if (asyncCodes) {
            return self._resolveAsyncCode(asyncCodes, code).then(function (newcode) {
                code = newcode;
            });
        }
    }).then(function () {
        // Define globals
        var fn = new Function(
                'isBoolean',
                'isEquals',
                'isNumber',
                'isString',
                'contains',
                'exists',
                'now',
                'auth',
                'data',
                'return !!(' + code + ')');//.bind(self);

        // Build globals
        var globals = [
            self.isBoolean,
            self.isEquals,
            self.isNumber,
            self.isString,
            self.contains,
            self.exists,
            self.now,
            self.auth,
            self.data
        ];

        return fn.apply(self, globals);
    });
};

// # Resolve asynchronous code in a rule {attr}
Evaluator.prototype._resolveAsyncCode = function (asyncCodes, code) {
    var self = this;

    // Iterate over all async codes and create a promise array
    var tasks = _.map(asyncCodes, function (asyncCode) {
        // Define globals {async code is called via 'this' because it needs self context}
        var fn = new Function(
                'auth',
                'data',
                'return this._' + asyncCode);//.bind(self);

        // Build globals
        var globals = [
            self.auth,
            self.data
        ];

        // Return a Promise
        return fn.apply(self, globals).then(function (response) {
            // Replace async code by static value
            code = code.replace(asyncCode, response);
        });
    });

    // Return when all done
    return Promise.all(tasks).then(function () {
        return code;
    });
};

// # Update evaluator data
Evaluator.prototype.updateData = function (data) {
    var self = this;
    self.data = data;
};

// # Update evaluator auth
Evaluator.prototype.updateAuth = function (auth) {
    var self = this;
    self.auth = auth;
};