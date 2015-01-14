// # Libs Index
module.exports = {
    dynamodb: startDynamo()
};

/*--------------------------------------*/

// # Dynamo DB
function startDynamo() {
    return require('./dynamodb')({
        credentials: {
            accessKey: 'test',
            secretKey: 'test',
            region: 'us-east-1'
        },
        dynamodb: {
            endpoint: 'http://localhost:9090'
        }
    });
}
