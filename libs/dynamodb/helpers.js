// AWS Dynamodb => Helpers
var _ = require('lodash');

var helpers = {
    alias: {
        encodeAttributes: {
            names: function (attr) {
                //create new reference
                var result = {};

                _.each(attr, function (value, key) {
                    result['#' + key] = value;
                });

                return result;
            },
            values: function (attr) {
                //create new reference
                var result = {};

                _.each(attr, function (value, key) {
                    result[':' + key] = helpers.encodeAttribute(value);
                });

                return result;
            }
        }
    },
    item: {
        decodeAttributes: function (attr) {
            //create new reference
            var result = {};

            _.each(attr, function (value, key) {
                result[key] = helpers.decodeAttribute(value);
            });

            return result;
        },
        encodeAttributes: function (attr) {
            //create new reference
            var result = {};

            _.each(attr, function (value, key) {
                result[key] = helpers.encodeAttribute(value);
            });

            return result;
        }
    },
    //use => {accountId: ['=', {int}],userMail: ['<', '{string}']}
    items: {
        decodeAttributes: function (attrArray) {
            //create new reference
            var result = [];

            _.each(attrArray, function (attr, index) {
                //Build Object
                result[index] = {};
                _.each(attr, function (value, key) {
                    result[index][key] = helpers.decodeAttribute(value);
                });
            });

            return result;
        },
        encodeAttributes: function (attr) {
            //create new reference
            var result = {};

            _.each(attr, function (value, key) {
                //Build Object
                result[key] = {};
                result[key].AttributeValueList = [];

                // If array, the snippet might be ['=',value], ['>=', value], otherwise no
                if (_.isArray(value)) {
                    result[key].ComparisonOperator = helpers.items.encodeComparisionOperator(value[0]);
                    result[key].AttributeValueList.push(helpers.encodeAttribute(value[1]));

                    //BETWEEN uses two attributes
                    if (result[key].ComparisonOperator === 'BETWEEN' && value[2]) {
                        result[key].AttributeValueList.push(helpers.encodeAttribute(value[2]));
                    }
                } else {
                    result[key].ComparisonOperator = 'EQ';
                    result[key].AttributeValueList.push(helpers.encodeAttribute(value));
                }
            });

            return result;
        },
        encodeComparisionOperator: function (symbol) {
            var comparisionOperators = {
                '=': 'EQ',
                '<=': 'LE',
                '<': 'LT',
                '>=': 'GE',
                '>': 'GT',
                '^': 'BEGINS_WITH',
                '~': 'BETWEEN'
            };

            return comparisionOperators[symbol];
        }
    },
    update: {
        encodeAttributes: function (attr) {
            //create new reference
            var result = {};

            _.each(attr, function (value, key) {
                //Build Object
                result[key] = {};
                result[key].Action = 'PUT';
                result[key].Value = helpers.encodeAttribute(value);
            });

            return result;
        }
    },
    schema: {
        encodeAttribute: function (attr) {
            //create new reference
            var result = {};
            var attributeType = {
                STRING: 'S',
                NUMBER: 'N',
                BOOLEAN: 'B'
            };

            if (attr.indexOf(' as ') > 0) {
                attr = attr.split('as');
                result.name = attr[0].trim();
                result.type = attributeType[attr[1].trim()];
            } else {
                result.name = attr.trim();
                result.type = 'S';
            }

            return result;
        }
    },
    decodeAttribute: function (attr) {
        var result;
        var key = Object.keys(attr)[0];
        var value = attr[key];

        switch (key) {
            case 'L':
                result = helpers.decodeList(value);
                break;
            case 'M':
                result = helpers.decodeMap(value);
                break;
            case 'N':
                result = parseInt(value);
                break;
            case 'NS':
                result = helpers.decodeNumberSet(value);
                break;
            case 'S':
                result = value.replace('[:null]', '');
                break;
            default:
                result = value;
                break;
        }

        return result;
    },
    encodeAttribute: function (attr) {
        // If is array define a number set or string set
        if (_.isArray(attr)) {
            if (helpers.isStringArray(attr)) {
                // SS
                return {SS: attr || []};
            } else if (helpers.isNumberArray(attr)) {
                // NS
                return {NS: helpers.encodeNumberset(attr) || []};
            } else {
                // L
                return {L: helpers.encodeList(attr)};
            }
        }

        // L
        if (_.isObject(attr)) {
            return {M: helpers.encodeMap(attr)};
        }

        // Primary types {S, BOOL, N}
        return {
            string: {S: attr || '[:null]'},
            boolean: {BOOL: attr || false},
            number: {N: attr ? attr.toString() : '0'}
        }[typeof attr];
    },
    decodeList: function (list) {
        //create new reference
        var result = [];

        // Walk trough list values
        _.each(list, function (value, key) {
            result[key] = helpers.decodeAttribute(value);
        });

        return result;
    },
    decodeMap: function (map) {
        //create new reference
        var result = {};

        // Walk trough object values
        _.each(map, function (value, key) {
            result[key] = helpers.decodeAttribute(value);
        });

        return result;
    },
    decodeNumberSet: function (set) {
        //create new reference
        var result = [];

        // Walk trough set values
        _.each(set, function (value, key) {
            result.push(parseInt(value));
        });

        return result;
    },
    encodeList: function (list) {
        //create new reference
        var result = [];

        // Walk trough list values
        _.each(list, function (value, key) {
            result.push(helpers.encodeAttribute(value));
        });

        return result;
    },
    encodeMap: function (map) {
        //create new reference
        var result = {};

        // Walk trough object values
        _.each(map, function (value, key) {
            result[key] = helpers.encodeAttribute(value);
        });

        return result;
    },
    encodeNumberset: function (set) {
        //create new reference
        var result = [];

        // Walk trough set values
        _.each(set, function (value, key) {
            result.push(value.toString());
        });

        return result;
    },
    isStringArray: function (attr) {
        return _.every(attr, function (v) {
            return typeof v === 'string';
        });
    },
    isNumberArray: function (attr) {
        return _.every(attr, function (v) {
            return typeof v === 'number';
        });
    }
};

module.exports = helpers;