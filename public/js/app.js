// # App

//var instance = orangeLive('*/i4w2jjtp');
var instance = orangeLive('*').setIndex({
    string: ['name'],
    number: ['height', 'age']
});

var query = instance.on({
    load: function (data) {
        console.log('on load');

        _.each(data, function (value) {
            console.log(value.key, value.name, value.height, value.age);
        });

    },
    add: function (data) {
        console.log('on add');
        console.log(data.key, data.name, data.height, data.age);
    },
    dataUpdate: function (data) {
        console.log('on dataUpdate');

        _.each(data, function (value) {
            console.log(value.key, value.name, value.height, value.age);
        });
    }
}).limit(5).useIndex('age');


setTimeout(function () {
    instance.set({
        name: 'Ana Rohde',
        height: Math.floor(Math.random(10, 90) * 100),
        age: Math.floor(Math.random(10, 90) * 100)
    });
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