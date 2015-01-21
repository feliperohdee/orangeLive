// # App
//var instance = orangeLive('*').select('name, height, age').useIndex('height');
var instance = orangeLive('*/-ci56s0mnc0004bmnrg8totgzf').on('load', function (data, pagination) {
    console.log('instance 1', data);

    if (pagination && pagination.prev) {
        $('#prev').removeAttr('disabled');
        $('#prev').unbind().bind('click', pagination.prev);
    } else {
        $('#prev').attr('disabled', 'disabled');
    }

    if (pagination && pagination.next) {
        $('#next').removeAttr('disabled');
        $('#next').unbind().bind('click', pagination.next);
    } else {
        $('#next').attr('disabled', 'disabled');
    }

    updateView(data);
}).on('add', function (data) {
    console.log('On add Event', data);
}).on('change', function (data) {
    console.log('On change Event', data);
}).on('fetch', function (data) {
    console.log('On fetch Event', data);
    updateView(data);
});

function updateView(data) {
    $('body').find('table tbody').html('');
    $('body').find('#data').html('');

    if (_.isArray(data)) {
        _.each(data, function (value) {
            $('body').find('table tbody').append('<tr><td>' + JSON.stringify(value) + '</td></tr>');
        });
    } else {
        $('body').find('#data').html(JSON.stringify(data));
    }
}

var instance2 = orangeLive('*/-ci56s0mnc0004bmnrg8totgzf').on('load', function (data) {
    console.log('instance 2', data);
});

setTimeout(function () {
    instance2.pushList({
        name: 'felipe',
        age: getRandomInt(10, 90)
    }, 'array');
}, 1000);

function add() {
    instance.insert({
        key: '-ci56s0mnc0004bmnrg8totgzf',
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: [{
                name: 'felipe',
                age: getRandomInt(10, 90)
            }]
    });
}

function push() {
    instance.push({
        key: '-ci56s0mnc0004bmnrg8totgzf',
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110)
    });
}

function increment() {
    instance2.increment(1, 'age');
}

function decrement() {
    instance2.decrement(1, 'age');
}

function update() {
    instance2.update({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa'
    }, 1);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}