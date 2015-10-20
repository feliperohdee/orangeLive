// # Libs Index
var _ = require('lodash');
var config = require('.././config.json');

module.exports = {
    dynamodb: startDynamo()
};

/*--------------------------------------*/

// # Dynamo DB
function startDynamo() {
    var endpoint = _.get(config, 'dynamodb.endpoint', false);

    config = {
        credentials: {
            accessKey: _.get(config, 'dynamodb.accessKey', 'test'),
            secretKey: _.get(config, 'dynamodb.secretKey', 'test'),
            region: _.get(config, 'dynamodb.region', 'us-east-1'),
        }
    };

    if (endpoint) {
        _.set(config, 'dynamodb.endpoint', endpoint);
    }

    return require('smallorangedynamo')(config);
}

