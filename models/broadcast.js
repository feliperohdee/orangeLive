// # Broadcast Model
var _ = require('lodash');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var messageBus = new EventEmitter();
var redis = require('redis');
var channels = {};

// Create redis clients
var sub = redis.createClient(6379, '127.0.0.1');
var pub = redis.createClient(6379, '127.0.0.1');

_listen();

module.exports = {
    publish: publish,
    subscribe: subscribe
};

/*--------------------*/

// # Dispatcher
function _dispatch(channel, data) {
    // Emit just when there are subscribers
    if (!!channels[channel]) {
        messageBus.emit(channel, data);
    }
}

function _listen() {
    // Subscribe to broadcast channel
    sub.subscribe('broadcast');

    // Listen Messages
    sub.on('message', function (channel, response) {
        // Parse JSON
        response = JSON.parse(response);

        // Always dispatch to just namespace channel {hit collections}
        _dispatch(response.namespace, {
            operation: response.operation,
            data: response.data
        });

        // If key dispatch to namespace + key {hit items}
        if (response.key) {
            _dispatch(response.namespace + '/' + response.key, {
                operation: response.operation,
                data: response.data
            });
        }
    });

    // Each 1000 ms clean all channels
    /*
    setInterval(function () {
        //
        _.each(channels, function (value, channel) {
            console.log('gc');
            _dispatch(channel, {});
        });
    }, 5000);
    */
}

// # Publish
function publish(object) {
    // Publish in broadcast channel
    return pub.publish('broadcast', JSON.stringify(object));
}

// # Store Channel
function storeChannel(channel) {
    if (!channels[channel])
        channels[channel] = 0;

    channels[channel]++;
    
    console.log(channels[channel]);
}

// # Remove Channel
function removeChannel(channel) {
    delete channels[channel];
}

// # Subscribe
function subscribe(object) {
    return new Promise(function (resolve) {
        // Hold connection and resolve when there is a response
        var channel = object.namespace;

        if (object.key) {
            channel += '/' + object.key;
        }
        
        // Store channel
        storeChannel(channel);

        messageBus.once(channel, function (response) {
            // Remove channel
            removeChannel(channel);
            //
            resolve(response);
        });
    });
}