// # App
//var instance = orangeLive('*').select('name, height, age').useIndex('height');
var instance = orangeLive('dlBSd$ib89$Be2/users').useIndex('age').on('load', function (data, count, pagination) {
    console.log('instance 1', data);
    console.log('instance 1 count', count);

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
}).on('put', function (data) {
    console.log('instance 1 On put Event', data);
}).on('fetch', function (data) {
    console.log('instance 1 On fetch Event', data);
    updateView(data);
});

var instance2 = orangeLive('dlBSd$ib89$Be2/users/rohde5').on('load', function (data) {
    console.log('instance 2', data);
}).on('put', function (data) {
    console.log('instance 2 On put Event', data);
});

function add() {
    instance.put({
        key: '-ci56s0mnc0004bmnrg8totgzf',
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: ['c', 'b'],
        map: {
            name: 'Heron'
        }
    });
}

function increment() {
    instance2.increment(1, 'age');
}

function decrement() {
    instance2.decrement(1, 'age');
}

function update() {
    instance2.put({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: ['c']
    });
}

var instance3 = orangeLive('dlBSd$ib89$Be2/users/rohde').on('load', function (data) {
    console.log('instance 3', data);
}).on('put', function (data) {
    console.log('instance 3 On put Event', data);
});


function _update() {
    instance3.putWithCondition(function (data) {
        if (!data) {
            return {
                name: 'rohde',
                age: 19,
                rank: +new Date
            };
        }
    });
}

function pushList() {
    instance2.pushList('a', 'array');
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

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