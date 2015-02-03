// # App
var instance = new orangeLive('dlBSd$ib89$Be2/users').last(5).select('age').indexedBy('age').on('load', function (data, count, pagination) {
    //console.log('instance 1', data);
    //console.log('instance 1 count', count);

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

    /*
     if (_.isArray(data)) {
     _.each(data, function (item) {
     if (item.key() === 'rohde5') {
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
     */

    updateView(data);
}).on('save', function (data) {
    //console.log('instance 1 On save Event', data);
}).on('save:update', function (data) {
    //console.log('instance 1 On save update Event', data);
}).on('fetch', function (data) {
    //console.log('instance 1 On fetch Event', data);
    updateView(data);
}).on('stream', function (data) {
    //console.log('instance 1 On stream Event', data);
});

function add() {
    instance.save({
        //key: 'rohde1',
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: ['c', 'b'],
        map: {
            age: 0,
            name: 'Heron',
            array: ['pqna']
        }
    });
}

var instance2 = new orangeLive('dlBSd$ib89$Be2/users/rohde1').on('load', function (data) {
    //console.log('instance 2', data.value());
}).on('save', function (data) {
    //console.log('instance 2 On save Event', data);
});

function update() {
    instance2.save({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110),
        address: 'floripa',
        array: ['c'],
        map: {
            age: 100,
            stats: {
                clicks: 0
            }
        }
    });
}

function increment() {
    instance2.increment('age', 1);
}

function decrement() {
    instance2.decrement('age', 1);
}
//
//
//function pushList() {
//    instance2.pushList('array', 'pqno');
//}
//
///*
//var instance3 = new orangeLive('dlBSd$ib89$Be2/users/rohde1').on('load', function (data) {
//    //console.log('instance 3', data);
//}).on('save', function (data) {
//    console.log('instance 3 On save Event', data);
//});
//*/
//
//function updateWithCondition() {
//    instance3.saveWithCondition(function (data) {
//        if (data.rule) {
//            return {
//                rule: {
//                    type: 'condition',
//                    description: 'hello'
//                }
//            };
//        }
//    });
//}

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
