// # Libs Index
var _ = require('lodash');
var config = require('.././config.json');

module.exports = {
    dynamodb: startDynamo()
};

/*--------------------------------------*/

// # Dynamo DB
function startDynamo() {
    return require('smallorangedynamo')({
        credentials: {
            accessKey: _.get(config, 'dynamodb.accessKey', 'test'),
            secretKey: _.get(config, 'dynamodb.accessKey', 'test'),
            region: _.get(config, 'dynamodb.region', 'us-east-1'),
        },
        dynamodb: {
            endpoint: _.get(config, 'dynamodb.endpoint', 'http://localhost:9090')
        }
    });
}
