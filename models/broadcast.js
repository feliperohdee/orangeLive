// # Broadcast Model
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var messageBus = new EventEmitter();
var redis = require('redis');
var requests = [];

// Create redis clients
var sub = redis.createClient(6379, '127.0.0.1');
var pub = redis.createClient(6379, '127.0.0.1');

__construct();

module.exports = {
    publish: publish,
    subscribe: subscribe
};

/*--------------------*/

function __construct() {
    // Subscribe to broadcast channel
    sub.subscribe('broadcast');

    // Listen Messages
    sub.on('message', function (channel, response) {
        // Parse JSON
        response = JSON.parse(response);
        
        _dispatch(response.namespace, response);
    });

    // Each 1000 ms clean all requests
    setInterval(function () {
        //
        while (requests.length > 0) {
            _dispatch(requests.shift(), {});
        }
    }, 1000);
}

// # Dispatcher
function _dispatch(namespace, data) {
    var subscribers = messageBus.listeners(namespace).length;
    
    // Emit just when there are subscribers
    if (subscribers) {
        messageBus.emit(namespace, data);
    }
}

// # Publish
function publish(object) {
    // Publish in broadcast channel
    return pub.publish('broadcast', JSON.stringify({
        namespace: object.namespace,
        operation: object.operation,
        data: object.data
    }));
}

// # Subscribe
function subscribe(object) {

    return new Promise(function (resolve) {
        // Hold connection and resolve when there is a response
        var address = object.namespace + (object.key ? '/' + object.key : '');

        // Store addresses listening
        requests.push(address);

        messageBus.once(address, function (response) {
            resolve(response);
        });
    });
}