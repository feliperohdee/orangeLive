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

    // # Executor
    function _exec(operation, params, onComplete) {
        //
        var request = prepareRequest(operation, params);

        // Make request
        $.ajax({
            contentType: 'application/json',
            data: JSON.stringify(request.data || {}),
            method: request.method,
            url: request.url
        }).then(function (response) {
            //
            self.responsesManager.dispatch(operation, response);

            // onComplete callback
            if (onComplete) {
                onComplete(response);
            }
        }).fail(function (err) {
            console.error({
                status: err.status,
                message: err.responseJSON
            });

            // onComplete callback
            if (onComplete) {
                onComplete(false, {
                    status: err.status,
                    message: err.responseJSON
                });
            }
        });
    }

    // # Subscribe {execute infinite loop}
    function _subscribe() {
        //
        var request = prepareRequest('subscribe', {});

        // Make request
        $.ajax({
            url: request.url
        }).then(function (response) {
            //
            if(!_.isEmpty(response)){
                self.responsesManager.dispatch(response.operation, response.data);
            }

            // Pooling connection
            _subscribe();
        }).fail(function (err) {
            console.error({
                status: err.status,
                message: err.responseJSON
            });
        });
    }

    // # Prepare request
    function prepareRequest(operation, params) {
        //
        var methodsMap = {
            insert: 'push',
            item: 'get',
            remove: 'delete',
            subscribe: 'get',
            query: 'get',
            update: 'put'
        };

        var result = {
            method: methodsMap[operation]
        };

        // Extend params with namespace and indexes
        if(operation !== 'subscribe'){
            result.url = '/api/' + self.addressPath.namespace;
        }else{
            result.url = '/api/subscribe/' + self.addressPath.namespace;
        }

        // Append a key if exists
        if (self.addressPath.key || params.key) {
            result.url += '/' + self.addressPath.key || params.key;
            // Delete always, this param might be passed only via URL
            delete params.key;
        }

        // Append params only when get or delete
        if (!_.isEmpty(params) && result.method === 'get' || result.method === 'delete') {
            result.url += '?' + self.helpers.param(params);
        } else {
            // Otherwise feed data to put, or post
            result.data = params;
        }

        return result;
    }

    // # Request Insert
    function insert(params) {
        var insertParams = {};

        if (params.priority)
            insertParams.priority = params.priority;

        if (params.set)
            insertParams.set = params.set;

        _exec('insert', insertParams);
    }

    // # Request Item
    function item(params) {
        var itemParams = {};

        if (params.consistent)
            itemParams.consistent = params.consistent;

        if (params.select)
            itemParams.select = params.select;

        _exec('item', itemParams);
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

        _exec('query', queryParams);
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

        _exec('update', updateParams, callback);
    }
};