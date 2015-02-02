// # Requests
orangeLive.prototype.requests = function () {
    //
    var self = this;

    _subscribe();

    return{
        insert: insert,
        item: item,
        query: query,
        update: update
    };

    /*=========================*/

    // # Fetch {query and item}
    function _fetch(operation, params) {
        //
        $.ajax({
            data: params || false,
            url: '/api/' + _makeURL()
        }).then(function (response) {
            //
            if (!_.isEmpty(response)) {
                self.responsesManager.dispatch(operation, response);
            }
        }).fail(function (err) {
            console.error({
                status: err.status,
                message: err.responseJSON
            });
        });
    }

    // # Set {insert, remove and update}
    function _set(operation, params, onComplete) {
        //
        var methodsMap = {
            insert: 'push',
            remove: 'delete',
            update: 'put'
        };

        //
        $.ajax({
            contentType: 'application/json',
            data: params ? JSON.stringify(params) : false,
            method: methodsMap[operation],
            url: '/api/' + _makeURL()
        }).then(function (response) {
            // onComplete callback
            if (onComplete) {
                onComplete(response);
            }
        }).fail(function (err) {
            // onComplete callback
            if (onComplete) {
                onComplete(false, {
                    status: err.status,
                    message: err.responseJSON
                });
            }
        });
    }

    // # Subscribe {listen sockets}
    function _subscribe() {
        //
        var url = 'ws://' + window.document.location.host + '/' + self.addressPath.namespace;
        var ws;

        _connect();
        _listen();

        /*======================*/

        function _connect() {
            //
            console.log('connecting');

            ws = new WebSocket(url);
        }

        function _listen() {
            ws.onopen = function () {
                console.log('Ws Opened');
            };

            ws.onclose = function () {
                console.log('Ws Closed');

                // Try reconnect
                setTimeout(_connect, 1500);
            };

            ws.onerror = function () {
                console.log('Ws Error');
            };

            ws.onmessage = function (response) {
                // Parse response
                response = JSON.parse(response.data);

                if (!_.isEmpty(response)) {
                    self.responsesManager.dispatch(response.operation, response.data);
                }
            };
        }
    }

    // # Make URL
    function _makeURL(key) {
        //
        var url = self.addressPath.namespace;

        // Append a key if exists
        if (self.addressPath.key || key) {
            url += '/' + self.addressPath.key || key;
        }

        return url;
    }

    // # Request Insert
    function insert(params) {
        var insertParams = {};

        if (params.priority)
            insertParams.priority = params.priority;

        if (params.set)
            insertParams.set = params.set;

        _set('insert', insertParams);
    }

    // # Request Item
    function item(params) {
        var itemParams = {};

        if (params.consistent)
            itemParams.consistent = params.consistent;

        if (params.select)
            itemParams.select = params.select;

        _fetch('item', itemParams);
    }

    // # Request Query
    function query(params) {
        var queryParams = {};

        if (params.condition)
            queryParams.condition = params.condition;

        if (params.consistent)
            queryParams.consistent = params.consistent;

        if (params.desc)
            queryParams.desc = params.desc;

        if (params.filters)
            queryParams.filters = params.filters;

        if (params.indexedBy)
            queryParams.indexedBy = params.indexedBy;

        if (params.limit)
            queryParams.limit = params.limit;

        if (params.select)
            queryParams.select = params.select;

        if (params.startAt)
            queryParams.startAt = params.startAt;

        _fetch('query', queryParams);
    }

    // # Request Update
    function update(params, callback) {
        var updateParams = {};

        // params.key should be used only by insert function, 
        // when key already exists
        if (params.key)
            updateParams.key = params.key;

        if (params.priority)
            updateParams.priority = params.priority;

        if (params.set)
            updateParams.set = params.set;

        if (params.special)
            updateParams.special = params.special;

        _set('update', updateParams, callback);
    }
};