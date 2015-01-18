// # App

var instance = orangeLive('*').defineIndexes({
    string: ['name'],
    number: ['height', 'age']
});

var instance2 = orangeLive('*/-ci52ofjx30004vqnr990ap3g1').defineIndexes({
    string: ['name'],
    number: ['height', 'age']
});

var query = instance.on({
    load: function (data) {
        console.log('on load', data);

        updateView(data);
    },
    add: function (data) {
        console.log('on add', data);
    },
    change: function (data) {
        console.log('on change', data);
    },
    collectionUpdate: function (data) {
        console.log('on collectionUpdate');

        updateView(data);
    }
}).limit(10).useIndex('age').between(105, 130);

function updateView(data) {

    $('body').find('table tbody').html('');
    $('body').find('#data').html('');

    if (_.isArray(data)) {
        _.each(data, function (value) {
            $('body').find('table tbody').append('<tr><td>' + value._key + '</td><td>' + value.name + '</td><td>' + value.height + '</td><td>' + value.age + '</td></tr>');
        });
    }else{
        $('body').find('#data').html(JSON.stringify(data));
    }
}

function add() {
    instance.set({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 115)
    });
}

function update() {
    instance2.set({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 110)
    });
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}