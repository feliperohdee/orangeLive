// # App

//var instance = orangeLive('*/i4w2jjtp');
var instance = orangeLive('*').limit(10)
        .on('load', function (data) {
            console.log('on load');
            console.log(data);
        })
        .on('dataUpdate', function (data) {
            console.log('on dataUpdate');
            console.log(data);
        })
        .on('add', function (data) {
            console.log('on add');
            console.log(data);
        });

setTimeout(function () {
    instance.set();
}, 1000);


/*
 setTimeout(function () {
 socket.emit('query', {
 table: 'tblLiveOne',
 limit: 2,
 where: {
 namespace: ['=', '*']
 }
 });
 }, 1000);
 */