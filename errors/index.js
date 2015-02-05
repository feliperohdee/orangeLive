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