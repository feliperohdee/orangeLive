// AWS Dynamodb => Schema
var _ = require('lodash');
var uniqid = require('uniqid');
var helpers = require('./helpers');
var schemaCollection = {};

module.exports = {
    set: set,
    validateAbsoluteWhere: validateAbsoluteWhere,
    validatePutData: validatePutData,
    validateUpdateData: validateUpdateData
};

/* ======================================================================== */

/**
 * Get
 * 
 * @param {string} table
 * @returns {object} data
 */
function _get(table) {
    //
    return schemaCollection[table] || false;
}

/**
 * Normalize
 * 
 * @param {object} schema
 * @param {object} data
 * @returns {object} data
 *
 * - Set lowerCases, upperCases n'trim
 * 
 */
function _normalize(schema, data) {
    // To Upper Case
    if (schema.inLowerCase) {
        _.each(schema.inLowerCase, function (key) {
            if (typeof data[key] === 'string') {
                data[key] = data[key].toLowerCase();
            }
        });
    }

    // To Lower Case
    if (schema.inLowerCase) {
        _.each(schema.inUpperCase, function (key) {
            if (typeof data[key] === 'string') {
                data[key] = data[key].toUpperCase();
            }
        });
    }

    // Just trim
    _.each(data, function (value, key) {
        if (typeof data[key] === 'string') {
            data[key] = value.trim();
        }
    });

    return data;
}

/**
 * Set
 * 
 * @param {string} table
 * @returns this
 * @methods {
 *      withHash()
 *      withRange()
 *      withDefault()
 *      inLowerCase()
 *      inUpperCase()
 * }
 */
function set(table) {
    //Create obj
    schemaCollection[table] = {};
    schemaCollection[table].hash = {};
    schemaCollection[table].range = {};
    schemaCollection[table].defaults = {};
    schemaCollection[table].inLowerCase = [];
    schemaCollection[table].inUpperCase = [];

    var schema = _get(table);

    return {
        inLowerCase: inLowerCase,
        inUpperCase: inUpperCase,
        withDefault: withDefault,
        withHash: withHash,
        withRange: withRange
    };

    /*---------------------------------------*/

    // # Set In Lower Case
    function inLowerCase(attribute) {
        schema.inLowerCase.push(attribute);
        return this;
    }

    // # Set In Upper Case
    function inUpperCase(attribute) {
        schema.inUpperCase.push(attribute);
        return this;
    }

    // # Set Default
    function withDefault(_default) {
        //
        _.extend(schema.defaults, _default);
        return this;
    }

    // # Set Hash
    function withHash(hash) {
        //
        schema.hash = helpers.schema.encodeAttribute(hash);
        return this;
    }

    // # Set Range
    function withRange(range) {
        //
        schema.range = helpers.schema.encodeAttribute(range);
        return this;
    }
}

/**
 * Validate Absolute Where
 * 
 * @param {string} table
 * @param {object} data
 * @returns {data}
 * 
 * - Isolate just hash and range key
 *
 */
function validateAbsoluteWhere(table, data) {
    //create new data reference
    var _data = {};
    var schema = _get(table);

    if (schema) {
        //
        var hashKey = (schema.hash && schema.hash.name) ? schema.hash.name : false;
        var rangeKey = (schema.range && schema.range.name) ? schema.range.name : false;

        // Set HASH
        if (hashKey) {
            _data[hashKey] = data[hashKey];
        }

        // Set RANGE
        if (rangeKey) {
            _data[rangeKey] = data[rangeKey];
        }
    }

    return _data;
}

/**
 * Validate Put Data
 * 
 * @param {string} table
 * @param {object} data
 * @returns {object} _data
 * 
 * - Attach default values, or create for range and hash if they haven't exists
 * - Apply cases, like lowerCases and upperCases
 *
 */
function validatePutData(table, data) {
    //create new data reference
    var _data = _.extend({}, data);
    var schema = _get(table);
    var automaticKeyDefault = {
        S: uniqid(),
        N: +new Date,
        B: false
    };

    if (schema) {
        // Apply Defaults
        if (schema.defaults) {
            _.each(schema.defaults, function (value, key) {
                // If there is no value in data, apply default
                if (!_data[key]) {
                    _data[key] = (value === 'TIMESTAMP') ? +new Date : value;
                }
            });
        }

        // Certify that HASH and RANGE keys are filled, otherwise, create automatic keys
        var hashKey = (schema.hash && schema.hash.name) ? schema.hash.name : false;
        var hashKeyType = (schema.hash && schema.hash.type) ? schema.hash.type : false;
        var rangeKey = (schema.range && schema.range.name) ? schema.range.name : false;
        var rangeKeyType = (schema.range && schema.range.type) ? schema.range.type : false;

        // If HASH not filled, apply an automatic key default
        if (hashKey && !_data[hashKey]) {
            _data[hashKey] = automaticKeyDefault[hashKeyType];
        }

        // If RANGE not filled, apply an automatic key default
        if (rangeKey && !_data[rangeKey]) {
            _data[rangeKey] = automaticKeyDefault[rangeKeyType];
        }

        //Apply lowercase n' uppercase if exists, and trim
        _data = _normalize(schema, _data);
    }

    return _data;
}

/**
 * Validate Update Data
 * 
 * @param {string} table
 * @param {object} data
 * @returns {data}
 * 
 * - Apply defaults
 * - Remove hash and range key
 *
 */
function validateUpdateData(table, data) {
    //create new data reference
    var _data = _.extend({}, data);
    var schema = _get(table);

    if (schema) {
        // Apply Defaults
        if (schema.defaults) {
            _.each(schema.defaults, function (value, key) {
                // If there is no value in data, and not TIMESTAMP apply default
                if (!_data[key] && value !== 'TIMESTAMP') {
                    _data[key] = value;
                }
            });
        }

        // Remove HASH and RANGE Keys
        var hashKey = (schema.hash && schema.hash.name) ? schema.hash.name : false;
        var rangeKey = (schema.range && schema.range.name) ? schema.range.name : false;

        // Remove HASH
        if (hashKey) {
            delete _data[hashKey];
        }

        // Remove RANGE
        if (rangeKey) {
            delete _data[rangeKey];
        }

        //Apply lowercase n' uppercase if exists, and trim
        _data = _normalize(schema, _data);
    }

    return _data;
}