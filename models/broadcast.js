// # Broadcast Model
var _ = require('lodash');
var Promise = require('bluebird');
var redis = require('redis');
var url = require('url');
var rulesModel = require('./rules');
var securityModel = require('./security');
var config = require('.././config.json');

// Create redis clients
var redisPub = redis.createClient(_.get(config, 'redis.port', 6379), _.get(config, 'redis.host', '127.0.0.1'));
var redisSub = redis.createClient(_.get(config, 'redis.port', 6379), _.get(config, 'redis.host', '127.0.0.1'));
var redisPassword = _.get(config, 'redis.password', false);

if(redisPassword){
    redisPub.auth(redisPassword);
    rediredisSubsPub.auth(redisPassword);
}

//
var clientsByChannel = {}; // Retrieve all clients in a channel and their auth
var channelByClient = {}; // Retrieve what channel a client is connected
var clients = {}; // Store client's socket objects

_construct();

module.exports = {
    publish: publish
};

/*--------------------*/

function _construct() {
    // Listen socket connection
    ws.on('connection', function (clientSocket) {
        //
        var clientUrl = url.parse(clientSocket.upgradeReq.url, true);
        var clientHeaders = clientSocket.upgradeReq.headers;
        var clientId = clientHeaders['sec-websocket-key'];
        var channelId = clientUrl.pathname.replace(/^\/|\/$/g, ''); // Remove first slash => account/table/{key}

        _subscribeClient(clientId, clientSocket, channelId);

        // Handle close connections
        clientSocket.on('close', function () {
            _unsubscribeClient(clientId);
        });

        // Handle inbound messages
        clientSocket.on('message', function (response) {
            // Parse response
            try {
                response = JSON.parse(response);
            } catch (err) {
                return;
            }

            // Append Channel Id
            response.sendTo = [channelId];
        });
    });

    // Subscribe to redis broadcast channel
    redisSub.subscribe('broadcast');

    // Handle redis broacasts
    redisSub.on('message', function (c, response) {
        // Decode and dispatch response
        _dispatch(JSON.parse(response));
    });
}

// # Create Channel
function _createChannel(channelId) {
    clientsByChannel[channelId] = {};
}

// # Delete Channel
function _deleteChannel(channelId) {
    delete clientsByChannel[channelId];
}

// # Dispatch
function _dispatch(response) {
    //
    var channels = [
        [response.to.account, response.to.table].join('/'), // Collection channel
        [response.to.account, response.to.table, response.to.key].join('/') // Item channel
    ];

    // Fetch table's rules
    var rules = rulesModel.get(response.to.table);

    channels.forEach(function (channelId) {
        // Test if there are clients in this channelId
        if (!_.isEmpty(clientsByChannel[channelId])) {
            //
            securityModel.filterClients({
                account: response.to.account,
                // get clients inside channel id
                clients: clientsByChannel[channelId],
                data: response.data,
                rules: rules
            }).each(function (id) {
                try {
                    clients[id].send(JSON.stringify(response));
                } catch (err) {
                    console.error(err.message);
                }
            });
        }
    });
}

// # Publish
function publish(object) {
    // Encode and publish in broadcast
    return redisPub.publish('broadcast', JSON.stringify(object));
}

// # Subscribe Client
function _subscribeClient(clientId, clientSocket, channelId) {
    // If channelId doesn't exists, create it
    if (!clientsByChannel[channelId]) {
        _createChannel(channelId);
    }

    // Subscribe client
    channelByClient[clientId] = channelId;
    clientsByChannel[channelId][clientId] = {
        id: 10
    };
    clients[clientId] = clientSocket;
}

// # Unsubscrbe Client
function _unsubscribeClient(clientId) {
    // Seek what channelId this client is connected
    var channelId = channelByClient[clientId];

    // Delete client from channelId, and client obj
    delete clientsByChannel[channelId][clientId];
    delete clients[clientId];

    // Test if there are more clients in this channelId, if no, delete it too
    if (_.isEmpty(clientsByChannel[channelId])) {
        _deleteChannel(channelId);
    }
}
