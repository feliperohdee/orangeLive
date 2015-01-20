// # App

var instance = orangeLive('*/-ci547pll0000062nr1va9ndcy');

var item = instance.on('load', function (data) {
    console.log('On Load Event', data);
    updateView(data);
}).on('change', function (data) {
    console.log('On change Event', data);
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

/*
 function add() {
 instance.insert({
 name: 'Rohde Test',
 height: getRandomInt(10, 90),
 age: getRandomInt(105, 115)
 });
 }
 */

function push() {
    item.push('test', {
        name: 'Rohde Test',
        height: getRandomInt(0, 90),
        age: getRandomInt(105, 110)
    }, 1);
}

function update() {
    item.update({
        //name: 'Rohde Test',
        height: getRandomInt(0, 90)
        //age: getRandomInt(105, 110)
    }, 1);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}