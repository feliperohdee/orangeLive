// # orangeLive
function orangeLive(address) {
    //
    'use strict';
    
    var addressParams = {
        key: address.split('/')[2] || false
    };

    var indexes = {
        string: ['name'],
        number: ['height', 'age']
    };

    var instance;
    var isCollection = false;

    var socket = io({
        forceNew: true,
        query: 'address=' + address
    });

    return __construct();

    /*----------------------------*/
}