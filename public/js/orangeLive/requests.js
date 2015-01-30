// # Requests
orangeLive.prototype.requests = function () {
    //
    var self = this;

    return{
        insert: insert,
        item: item,
        query: query,
        update: update
    };

    /*=========================*/

    // # Executor
    function _exec(operation, params, callback, subscribe) {
        //
        var request = prepareRequest(operation, params);

        // Make request
        $.ajax({
            contentType: 'application/json',
            data: JSON.stringify(request.data || {}),
            method: request.method,
            url: request.url
        }).then(function (result) {
            //
            self.responsesManager.dispatch(operation, result);

            if (subscribe) {
                _exec(operation, params, subscribe);
            }
        }).fail(function (err) {
            console.error(err.status, err.response);
        });
    }

    // # Prepare request
    function prepareRequest(operation, params) {
        //
        var methodsMap = {
            insert: 'push',
            item: 'get',
            remove: 'delete',
            query: 'get',
            update: 'put'
        };
        
        var result = {
            method: methodsMap[operation]
        };

        // Extend params with namespace and indexes
        result.url = '/api/' + self.addressPath.namespace;

        // Append a key if exists
        if (self.addressPath.key || params.key) {
            result.url += '/' + self.addressPath.key || params.key;
            // Delete always, this param might be passed only via URL
            delete params.key;
        }

        // Append params only when get or delete
        if (result.method === 'get' || result.method === 'delete' && !_.isEmpty(params)) {
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