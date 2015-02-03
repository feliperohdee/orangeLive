// # Orange Live
function orangeLive(address) {
    //
    'use strict';

    var self = this;

    self.addressPath = {
        account: address.split('/')[0] || false,
        table: address.split('/')[1] || false,
        key: address.split('/')[2] || false
    };

    self.helpers = self.helpers();

    self.indexes = {
        string: ['name'],
        number: ['height', 'age']
    };
    
    self.instance;
    self.isCollection = false;
    self.requestsManager = self.requests();
    self.responsesManager = self.responses();

    return __construct();

    /*=========================*/

    // # Construct
    function __construct() {
        //
        if (!self.addressPath.key) {
            // Create and return collection instance
            self.instance = self.collection();
            self.isCollection = true;
        } else {
            // Create and return item instance
            self.instance = self.item();
        }

        // Expose API
        //return _.extend(instance.api(), sharedAPI());
        return self.instance.api();
    }

    // Shared API either item and collection
    /*
    function sharedAPI() {
        //
        return{
            stream: stream
        };

        /*----------------------------*

        // # Stream
        function stream(data) {
            //
            requestStream({
                data: data
            });
        }
    }
    */
}