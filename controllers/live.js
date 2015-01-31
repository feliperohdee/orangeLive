// # Live Controller
var EventEmitter = require('events').EventEmitter;
var messageBus = new EventEmitter();
var redis = require('redis');
var memwatch = require('memwatch');

/*-----------  Memory Watch ----------*/
memwatch.on('leak', function (info) {
    console.log('===> LEAK DETECTED');
    console.log(info);
});

memwatch.on('stats', function (stats) {
    console.log('===> STATS');
    console.log(stats);
});
/*-----------  Memory Watch ----------*/

var sub = redis.createClient(6379, '127.0.0.1');
var pub = redis.createClient(6379, '127.0.0.1');

__construct();

module.exports = {
    get: get
};

/*--------------------*/

function __construct() {
    sub.subscribe('broadcast');

    sub.on('message', function (channel, data) {
        data = JSON.parse(data);

        var subscribers = messageBus.listeners(data.room).length;

        if (subscribers) {
            console.log('Emitting to %s with %s subscribers with process %s.', data.room, subscribers, process.pid);
            messageBus.emit(data.room, data.data);
        }
    });

    setInterval(function () {
        
        console.log('PID %s is publishing', process.pid);
        
        pub.publish('stream:' + process.pid, JSON.stringify({
            room: 'roomTest',
            data: +new Date
        }));
    }, 1000);
}

function get(req, res) {
    var evt = req.query.room.split(':')[0];

    console.log('=> PID %s', process.pid);

    messageBus.once(evt, function (data) {
        res.json({
            data: data
        });
    });
}