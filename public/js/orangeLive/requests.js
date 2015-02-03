// # Requests
orangeLive.prototype.requests = function () {
    //
    var self = this;
    var ws = false;

    _subscribe();

    return{
        insert: insert,
        item: item,
        stream: stream,
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

    // # Request Insert
    function insert(params, callback) {
        var insertParams = {};

        if (params.priority)
            insertParams.priority = params.priority;

        if (params.set)
            insertParams.set = params.set;

        _set('insert', insertParams, callback);
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

    // # Make URL
    function _makeURL(key) {
        //
        var url = self.addressPath.account + '/' + self.addressPath.table;

        // Append a key if exists
        if (self.addressPath.key || key) {
            url += '/' + (self.addressPath.key || key);
        }

        return url;
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

    // # Set {insert, remove and update}
    function _set(operation, params) {
        //
        var url;
        var methodsMap = {
            insert: 'post',
            remove: 'delete',
            update: 'put'
        };

        // If collection try to update an item emulate url with key
        if (params.key) {
            url = _makeURL(params.key);
        } else {
            url = _makeURL();
        }

        //
        $.ajax({
            contentType: 'application/json',
            data: params ? JSON.stringify(params) : false,
            method: methodsMap[operation],
            url: '/api/' + url
        }).fail(function (err) {
            console.error({
                status: err.status,
                message: err.responseJSON
            });
        });
    }

    // # Stream {stream without persistence, is called direct os websocket layer}
    function stream(data) {
        if (ws) {
            ws.send(JSON.stringify({
                operation: 'stream',
                data: data
            }));
        }
    }

    // # Subscribe {listen sockets}
    function _subscribe() {
        //
        var url = 'ws://' + window.document.location.host + '/' + _makeURL();

        _connect();

        /*======================*/

        function _connect() {
            // Enable ws object
            ws = new WebSocket(url);

            ws.onopen = function () {
                // start listen after suceed connection
                _listen();
            };

            ws.onclose = function () {
                // Disable ws object
                ws = false;
                // Try reconnect after error
                setTimeout(_connect, 1500);
            };
        }

        function _listen() {
            ws.onmessage = function (response) {
                // Parse response
                response = JSON.parse(response.data);

                if (!_.isEmpty(response)) {
                    self.responsesManager.dispatch(response.operation, response.data);
                }
            };
        }
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