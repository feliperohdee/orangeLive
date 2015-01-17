// # App

//var instance = orangeLive('*/i4w2jjtp');
var instance = orangeLive('*').defineIndexes({
    string: ['name'],
    number: ['height', 'age']
});

var query = instance.on({
    load: function (data) {
        console.log('on load');

        _.each(data, function (value) {
            console.log(value.key, value.name, value.height, value.age);
            $('#data').find('table').append('<tr>' + value.key + ' - ' + value.name + ' - ' + value.height + ' - ' + value.age + '</tr>')
        });

        updateView(data);
    },
    add: function (data) {
        console.log('on add');
        console.log(data.key, data.name, data.height, data.age);
    },
    dataUpdate: function (data) {
        console.log('on dataUpdate');

        _.each(data, function (value) {
            //console.log(value.key, value.name, value.height, value.age);
        });

        updateView(data);
    }
}).limit(5).useIndex('age').between(105, 130);

function updateView(data) {

    $('body').find('table tbody').html('');

    _.each(data, function (value) {
        $('body').find('table tbody').append('<tr><td>' + value.key + '</td><td>' + value.name + '</td><td>' + value.height + '</td><td>' + value.age + '</td></tr>');
    });
}

$(window).on('click', function () {
    instance.set({
        name: 'Rohde Test',
        height: Math.floor(Math.random(10, 90) * 100),
        age: 108//Math.floor(Math.random(10, 90) * 100)
    });
});