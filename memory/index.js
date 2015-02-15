// # Memory Watcher
var memwatch = require('memwatch');
var heapdump = require('heapdump');

if (false) {
    setInterval(function () {
        console.log('Logging');
        heapdump.writeSnapshot(); // or kill -USR2 <pid>
    }, 10000);
}

memwatch.on('leak', function (info) {
    console.log();
    console.log('Memory Leak');
    console.log(info);
    console.log();
});

memwatch.on('stats', function (stats) {
    console.log();
    console.log('Memory Stats');
    console.log(stats);
    console.log();
});