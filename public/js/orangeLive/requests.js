// # Requests
orangeLive.prototype.requests = function () {
    //
    var self = this;

    return{
        insert: insert,
        item: item,
        join: join,
        query: query,
        stream: stream,
        update: update
    };

    /*=========================*/

    // # Executor
    function _exec(operation, params) {
        // Extend params with namespace and indexes
        //self.socket.emit('request', operation, params);
        var url = '/api/' + self.addressParams.namespace;

        // Append a key if exists
        if (self.addressParams.key) {
            url += '/' + self.addressParams.key;
        }

        // Append params
        url += '?' + $.param(params);

        $.ajax({
            url: url,
            success: function (result) {
                console.log(result);
            },
            error: function (err) {
                console.error('Error');
            }
        });

    }

    // # Request Insert
    function insert(params) {
        _exec('insert', {
            priority: params.priority,
            set: params.set
        });
    }

    // # Request Item
    function item(params) {
        _exec('item', {
            consistent: params.consistent,
            key: params.key,
            select: params.select
        });
    }

    // # Request Join
    function join() {
        _exec('join');
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
        
        if (params.index)
            queryParams.index = params.index;
        
        if (params.limit)
            queryParams.limit = params.limit;
        
        if (params.select)
            queryParams.select = params.select;
        
        if (params.startAt)
            queryParams.startAt = params.startAt;

        _exec('query', queryParams);
    }

    // # Request Stream
    function stream(data) {
        _exec('stream', data);
    }

    // # Request Update
    function update(params) {
        _exec('update', {
            key: params.key,
            priority: params.priority,
            set: params.set,
            special: params.special
        });
    }
};