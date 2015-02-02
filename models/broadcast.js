// # Broadcast Model
var _ = require('lodash');
var Promise = require('bluebird');
var redis = require('redis');
var url = require('url');

// Create redis clients
var redisSub = redis.createClient(6379, '127.0.0.1');
var redisPub = redis.createClient(6379, '127.0.0.1');

//
var channels = {};
var channelPerClient = {};

// TEMPORARY
var fromToken = {
    account: 'dlBSd$ib89$Be2'
};

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
        var channel = fromToken.account + clientUrl.pathname;

        _subscribeClient(clientId, clientSocket, channel);

        // Handle close connections
        clientSocket.on('close', function () {
            _unsubscribeClient(clientId);
        });
    });

    // Subscribe to redis broadcast channel
    redisSub.subscribe('broadcast');
    
    // Handle redis broacasts
    redisSub.on('message', function (c, response) {
        // Parse JSON
        response = JSON.parse(response);

        var channel = response.namespace;
        var key = response.key;
        var data = {
            operation: response.operation,
            data: response.data
        };

        // ALWAYS dispatch to just namespace channel {hit collections}
        _dispatch(channel, data);

        // If key dispatch to namespace + key {hit items}
        if (key) {
            _dispatch(channel + '/' + key, data);
        }
    });
}

// # Publish
function publish(object) {
    // Publish in broadcast channel
    return redisPub.publish('broadcast', JSON.stringify(object));
}

// # Create Channel
function _createChannel(channel) {
    console.log('Channel created', channel);
    channels[channel] = {};
}

// # Delete Channel
function _deleteChannel(channel) {
    console.log('Channel closed', channel);
    delete channels[channel];
}

// # Dispatch
function _dispatch(channel, data) {
    // Iterate channel to look for clients
    //console.log('Dispatching to', channel);
    if (!_.isEmpty(channels[channel])) {
        _.each(channels[channel], function (clientSocket) {
            try {
                clientSocket.send(JSON.stringify(data));
            } catch (err) {
                console.log(err.message);
            }
        });
    }
}

// # Subscribe Client
function _subscribeClient(clientId, clientSocket, channel) {
    // If channel doesn't exists, create it
    if (!channels[channel]) {
        _createChannel(channel);
    }

    // Subscribe client
    console.log('Client created', channel, clientId);
    channelPerClient[clientId] = channel;
    channels[channel][clientId] = clientSocket;
}

// # Unsubscrbe Client
function _unsubscribeClient(clientId) {
    // Seek what channel this client is connected
    var channel = channelPerClient[clientId];

    // Delete client from channel
    console.log('Client closed', channel, clientId);
    delete channels[channel][clientId];

    // Test if there are more clients in this channel, if no, delete it too
    if (_.isEmpty(channels[channel])) {
        _deleteChannel(channel);
    }
}