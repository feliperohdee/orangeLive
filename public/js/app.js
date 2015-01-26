// # App
//var instance = orangeLive('*').select('name, height, age').useIndex('height');
var instance = orangeLive('dlBSd$ib89$Be2/users/rohde5/array').on('load', function (data, count, pagination) {
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

    if (_.isArray(data)) {
        _.each(data, function (item) {
            if (item.key() === 'rohde') {
                setTimeout(function () {
                    item.save({
                        age: item.value('age') + 1
                    });
                }, 1000);
            }
        });
    } else {
        setTimeout(function () {
            data.save({
                age: data.value('age') + 1
            });
        }, 1000);
    }

    updateView(data);
}).on('save', function (data) {
    console.log('instance 1 On save Event', data);
}).on('save:update', function (data) {
    console.log('instance 1 On save update Event', data);
}).on('fetch', function (data) {
    console.log('instance 1 On fetch Event', data);
    updateView(data);
}).on('stream', function(data){
    console.log('instance 1 On stream Event', data);
});

setTimeout(function(){
    instance.stream({
        event: 'huahukdh dkjewhdqwjd',
        data: 'helkdqwh dqqdlihqw doiqwdhwy'
    });
}, 500);

var instance2 = orangeLive('dlBSd$ib89$Be2/users/rohde5').on('load', function (data) {
    console.log('instance 2', data);
}).on('save', function (data) {
    console.log('instance 2 On save Event', data);
});

function add() {
    instance.save({
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
    instance2.save({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: ['c']
    });
}

function pushList() {
    instance2.pushList('pqno', 'array');
}

var instance3 = orangeLive('dlBSd$ib89$Be2/users/rohde5').on('load', function (data) {
    console.log('instance 3', data);
}).on('save', function (data) {
    console.log('instance 3 On save Event', data);
});


function updateWithCondition() {
    instance3.saveWithCondition(function (data) {
        if (!data) {
            return {
                name: 'rohde',
                age: 19,
                rank: +new Date
            };
        }
    });
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function updateView(data) {
    $('body').find('table tbody').html('');
    $('body').find('#data').html('');

    if (_.isArray(data)) {
        _.each(data, function (item) {
            $('body').find('table tbody').append('<tr><td>' + item.key() + '=' + JSON.stringify(item.value()) + '<br><br></td></tr>');
        });
    } else {
        $('body').find('#data').html(data.key() + '=' + JSON.stringify(data.value()));
    }
}