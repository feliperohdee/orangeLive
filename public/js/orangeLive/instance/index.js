// # Orange Live > Instance
(function () {
    //
    'use strict';

    OrangeLive.prototype.Instance = function (address) {
        //
        var self = this;

        self.addressPath = {
            account: address.split('/')[0] || false,
            table: address.split('/')[1] || false,
            key: address.split('/')[2] || false
        };

        self.helpers = self.helpers();

        // TEMPORARY
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

            // Extend API
            _.extend(self.instance.api(), sharedAPI());

            // Return instance
            return self.instance;
        }

        // Shared API either item and collection
        function sharedAPI() {
            //
            return{
                stream: stream
            };

            /*----------------------------*/

            // # Stream
            function stream(data) {
                //
                self.requestsManager.stream({
                    data: data
                });
            }
        }
    };
})();