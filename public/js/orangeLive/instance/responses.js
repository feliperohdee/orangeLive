// # Orange Live > Instance Responses
(function () {
    //
    'use strict';

    var Instance = OrangeLive.prototype.Instance;

    Instance.prototype.responses = function () {
        //
        var self = this;

        return{
            dispatch: dispatch
        };

        /*=========================*/

        // # Dispatch Response
        function dispatch(operation, response) {
            //
            switch (operation) {
                case 'insert':
                    // Update Collection Dataset
                    if (self.isCollection) {
                        self.instance.saveDataSet(response);
                        goEvent(['fetch', 'save', 'save:insert'], response);
                    }
                    break;
                case 'update':
                    // Update Collection/Item Dataset
                    self.instance.saveDataSet(response);
                    goEvent(['fetch', 'save', 'save:update'], response);
                    break;
                case 'del':
                    // Remove Collection/Item Dataset
                    self.instance.saveDataSet(response, 'remove');
                    goEvent(['fetch', 'remove'], response);
                    break;
                case 'update:atomic':
                case 'update:push':
                case 'update:removeAttr':
                    // Get atomic or push
                    var specialOperation = operation.split(':')[1];
                    var value = self.instance.handleSpecialOperation(specialOperation, response);

                    if (value) {
                        // Update Collection/Item Dataset
                        self.instance.saveDataSet(value, (specialOperation === 'removeAttr') ? 'strict' : '');
                        goEvent(['fetch', 'save', 'save:update'], value);
                    }
                    break;
                case 'item':
                case 'query':
                    // Load Data
                    self.instance.load(response);
                    // Dispatch Events
                    goEvent(['load'], response.data);
                    break;
                case 'stream':
                    goEvent(['stream'], response.data);
                    break;
                default:
                    console.log(operation, response);
            }
        }

        // # Dispatch Event
        function goEvent(events, data) {
            _.each(events, function (event) {
                // Get callback
                var callback = self.instance.getCallback(event);

                if (callback) {
                    switch (event) {
                        case 'load':
                            //Fetch dataset
                            var dataSet = self.instance.getDataSet();

                            if (self.isCollection) {
                                // Collection throw dataset, count, and pagination on load
                                var count = self.instance.getCount();
                                var pagination = self.instance.getPagination();

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
                            // When event is save || stream, throw just last transaction data
                            callback(data);
                            break;
                        default:
                            //Fetch dataset
                            var dataSet = self.instance.getDataSet();

                            // Otherwise throw just dataset
                            callback(dataSet);
                    }
                }
            });
        }
    };
})();