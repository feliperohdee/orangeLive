// # App

var instance = orangeLive('*/-ci547sg9v000262nrtxt2o4p8/name').defineIndexes({
    string: ['name'],
    number: ['height', 'age']
});

var instance2 = orangeLive('*/-ci547sg9v000262nrtxt2o4p8').defineIndexes({
    string: ['name'],
    number: ['height', 'age']
});

var paginationFunctions = {};

instance.on({
    load: function (data, pagination) {
        console.log('on load', data, pagination);

        if (pagination.prev) {
            $('#prev').removeAttr('disabled');
            $('#prev').unbind().bind('click', pagination.prev);
        } else {
            $('#prev').attr('disabled', 'disabled');
        }

        if (pagination.next) {
            $('#next').removeAttr('disabled');
            $('#next').unbind().bind('click', pagination.next);
        } else {
            $('#next').attr('disabled', 'disabled');
        }

        updateView(data);
    },
    insert: function (data) {
        console.log('on insert', data);
    },
    update: function (data) {
        console.log('on update', data);
    },
    collectionUpdate: function (data) {
        console.log('on collectionUpdate');

        updateView(data);
    }
}).limit(4).useIndex('height');//.between(105, 130);

function updateView(data) {
    $('body').find('table tbody').html('');
    $('body').find('#data').html('');

    if (_.isArray(data)) {
        _.each(data, function (value) {
            $('body').find('table tbody').append('<tr><td>' + value.key + '</td><td>' + value.name + '</td><td>' + value.height + '</td><td>' + value.age + '</td></tr>');
        });
    } else {
        $('body').find('#data').html(JSON.stringify(data));
    }
}

function add() {
    instance.insert({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 115)
    });
}

function update() {
    instance2.update({
        name: 'Rohde Test',
        height: getRandomInt(0, 90),
        age: getRandomInt(105, 110)
    }, 1);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}