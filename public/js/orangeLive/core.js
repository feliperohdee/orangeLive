// # Orange Live
function orangeLive(address) {
    //
    'use strict';
    
    var self = this;
    
    self.addressParams = {
        namespace: address.split('/')[1] || false,
        key: address.split('/')[2] || false
    };
    
    self.helpers = self.helpers();

    self.indexes = {
        string: ['name'],
        number: ['height', 'age']
    };
    
    self.requestsManager = self.requests();
    
    self.socket = io({
        forceNew: true,
        query: 'address=' + address
    });
    
    /**/

    var instance;
    var isCollection = false;

    return __construct();

    /*=========================*/

    // # Construct
    function __construct() {
        //
        if (!self.addressParams.key) {
            // Create and return collection instance
            instance = self.collection();
            isCollection = true;
        } else {
            // Create and return item instance
            instance = self.item();
        }

        // Start sockets
        bindSockets();

        // Expose API
        //return _.extend(instance.api(), sharedAPI());
        return instance.api();
    }

    // # Bind Sockets
    function bindSockets() {
        // # Reponse Success
        self.socket.on('responseSuccess', function (operation, result) {
            switch (operation) {
                case 'broadcast:insert':
                    // Update Collection Dataset
                    if (isCollection) {
                        instance.saveDataSet(result);
                        // Dispatch Events [fetch, save, save:insert]
                        dispatchEvents(['fetch', 'save', 'save:insert'], result);
                    }
                    break;
                case 'broadcast:update':
                    // Update Collection/Item Dataset
                    instance.saveDataSet(result);
                    // Dispatch Events [fetch, save, save:update]
                    dispatchEvents(['fetch', 'save', 'save:update'], result);
                    break;
                case 'broadcast:update:atomic':
                case 'broadcast:update:push':
                    // Get atomic or push
                    var specialOperation = operation.split(':')[2];
                    var value = instance.handleSpecialOperation(specialOperation, result);

                    if (value) {
                        // Update Collection/Item Dataset
                        instance.saveDataSet(value);
                        // Dispatch Events [fetch, save, save:update]
                        dispatchEvents(['fetch', 'save', 'save:update'], value);
                    }
                    break;
                case 'broadcast:stream':
                    // Dispatch Events
                    dispatchEvents(['stream'], result);
                    break;
                case 'sync:item':
                case 'sync:query':
                    // Load Data
                    instance.load(result);
                    // Dispatch Events
                    dispatchEvents(['load'], result.data);
                    break;
                default:
                    console.log(operation, result);
            }
        });

        // # Response Error
        self.socket.on('responseError', function (event, err) {
            console.error(event, err);
        });
    }

    // # Dispatch Event
    function dispatchEvents(events, data) {
        _.each(events, function (event) {
            // Get callback
            var callback = instance.getCallback(event);

            if (callback) {
                switch (event) {
                    case 'load':
                        //Fetch dataset
                        var dataSet = instance.getDataSet();

                        if (isCollection) {
                            // Collection throw dataset, count, and pagination on load
                            var count = instance.getCount();
                            var pagination = instance.getPagination();

                            callback(dataSet, count, pagination);
                        } else {
                            // Otherwise throw just dataset
                            callback(dataSet);
                        }
                        break;
                    case 'save':
                    case 'save:insert':
                    case 'save:update':
                    case 'stream':
                        // When event is save, throw just last transaction data
                        callback(data);
                        break;
                    default:
                        //Fetch dataset
                        var dataSet = instance.getDataSet();

                        // Otherwise throw just dataset
                        callback(dataSet);
                }
            }
        });
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
            requestStream({
                data: data
            });
        }
    }
}