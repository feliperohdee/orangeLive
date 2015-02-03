// # Broadcast Model
var debug = require('debug')('broadcastModel');
var _ = require('lodash');
var Promise = require('bluebird');
var redis = require('redis');
var url = require('url');
var msgpack = require('msgpack-js');

// Create redis clients
var redisPub = redis.createClient(6379, '127.0.0.1');
var redisSub = redis.createClient(6379, '127.0.0.1', {
    detect_buffers: true
});

//
var clientsByChannel = {}; // Retrieve all clients in a channel
var channelByClient = {}; // Retrieve what channel a client is connected

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

            // Choose method and handle it
            switch (response.operation) {
                case 'stream':
                    publish(response);
                    break;
            }
        });
    });

    // Subscribe to redis broadcast channel
    redisSub.subscribe('broadcast');

    // Handle redis broacasts
    redisSub.on('message', function (c, response) {
        // Decode response
        response = msgpack.decode(response);

        _dispatch(response.sendTo, {
            operation: response.operation,
            data: response.data
        });
    });
}

// # Create Channel
function _createChannel(channelId) {
    debug('Channel created ' + channelId);
    clientsByChannel[channelId] = {};
}

// # Delete Channel
function _deleteChannel(channelId) {
    debug('Channel closed ' + channelId);
    delete clientsByChannel[channelId];
}

// # Dispatch
function _dispatch(sendTo, data) {
    // Iterate channel to look for clients
    while (sendTo.length > 0) {
        //
        var channelId = sendTo.shift();

        // Test if there are clients in this channelId
        if (!_.isEmpty(clientsByChannel[channelId])) {
            // Yes, there are
            debug('Dispatching to ' + channelId);

            // Get clients inside this channelId
            _.each(clientsByChannel[channelId], function (clientSocket) {
                try {
                    clientSocket.send(JSON.stringify(data));
                } catch (err) {
                    debug(err.message);
                }
            });
        }
    }
}

// # Publish
function publish(object) {
    // Encode and publish in broadcast
    return redisPub.publish('broadcast', msgpack.encode(object));
}

// # Subscribe Client
function _subscribeClient(clientId, clientSocket, channelId) {
    // If channelId doesn't exists, create it
    if (!clientsByChannel[channelId]) {
        _createChannel(channelId);
    }

    // Subscribe client
    debug('Client created ' + channelId + ' ' + clientId);
    channelByClient[clientId] = channelId;
    clientsByChannel[channelId][clientId] = clientSocket;
}

// # Unsubscrbe Client
function _unsubscribeClient(clientId) {
    // Seek what channelId this client is connected
    var channelId = channelByClient[clientId];

    // Delete client from channelId
    debug('Client closed ' + channelId, clientId);
    delete clientsByChannel[channelId][clientId];

    // Test if there are more clients in this channelId, if no, delete it too
    if (_.isEmpty(clientsByChannel[channelId])) {
        _deleteChannel(channelId);
    }
}