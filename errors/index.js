// # Errors
var errors = require('errors');

// # Security Error
errors.create({
    name: 'securityError',
    code: 401,
    defaultMessage: 'This operation is disallowed by security rules.',
    defaultExplanation: 'The database administrator have created some ACL\'s that disallow some kind of operations at determined conditions.'
});

// # Missing Key Error
errors.create({
    name: 'missingKeyError',
    code: 400,
    defaultMessage: 'Missing Key.',
    defaultExplanation: 'No valid keys were provided. Please specify primary key field.'
});

// # Schema Keys Error
errors.create({
    name: 'outOfKeysError',
    code: 400,
    defaultMessage: 'Out of Keys Error.',
    defaultExplanation: 'One or more provided keys is/are disallowed and out of schema keys.'
});

// # Schema Rules Error
errors.create({
    name: 'outOfRulesError',
    code: 400,
    defaultMessage: 'Out of Schema Rules Error.',
    defaultExplanation: 'One or more provided values is/are disallowed and out of schema rules.'
});