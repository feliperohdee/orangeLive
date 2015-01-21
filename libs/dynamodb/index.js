// # DynamoDb Index
var AWS = require('aws-sdk');

module.exports = function (params) {
    //
    
    __construct(params || {});
    
    return {
        del: require('./del'),
        get: require('./get'),
        insert: require('./insert'),
        schema: require('./schema'),
        table: require('./table'),
        update: require('./update')
    };
};

/* ======================================================================== */

// Constructor
function __construct(params) {
    if (params.credentials) {
        AWS.config.update({
            accessKeyId: params.credentials.accessKey,
            secretAccessKey: params.credentials.secretKey,
            region: params.credentials.region || 'us-east-1'
        });
    }

    global.dynamodbInstance = new AWS.DynamoDB(params.dynamodb);
}