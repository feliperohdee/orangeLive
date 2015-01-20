// # App
//var instance = orangeLive('*').select('name, height, age').useIndex('height');
var instance = orangeLive('*/-ci547pll0000062nr1va9ndcy/name');

instance.on('load', function (data) {
    console.log('instance load', data);
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

var instance2 = orangeLive('*/-ci547pll0000062nr1va9ndcy');

function add() {
    instance.insert({
        name: 'Rohde Test',
        height: getRandomInt(10, 90),
        age: getRandomInt(105, 115),
        address: 'floripa'
    });
}

function push() {
    instance2.push('test', {
        name: 'Rohde Test',
        height: getRandomInt(0, 90),
        age: getRandomInt(105, 110)
    }, 1);
}

function update() {
    instance2.update({
        //name: 'Rohde Test',
        height: getRandomInt(0, 90),
        age: getRandomInt(105, 110),
        address: 'floripa'
    }, 1);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}