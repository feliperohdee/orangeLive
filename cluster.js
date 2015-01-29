var cluster = require('cluster');
var cpus = require('os').cpus();

if (cluster.isMaster) {
    
    if (false) {
        cpus.forEach(function (cpu) {
            cluster.fork();
        });
    } else {
        cluster.fork();
    }

    cluster.on('listening', function (worker) {
        console.log("Cluster %d connected", worker.process.pid);
    });

    cluster.on('disconnect', function (worker) {
        console.log('Cluster %d is disconnected.', worker.process.pid);
    });

    cluster.on('exit', function (worker) {
        console.log('Cluster %d exited.', worker.process.pid);
    });

} else {
    require('./app');
}