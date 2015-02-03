// # Api Index
var _ = require('lodash');

module.exports = {
    live: require('./live'),
    http: http
};

/* ======================================================================== */

/*
 * # HTTP
 *
 * Wrapper for API functions which are called via an HTTP request. Takes the API method and wraps it so that it gets
 * data from the request and returns a sensible JSON response.
 */

function http(apiMethod) {
    return function (req, res) {
        var response = {};

        // We define 2 properties for using as arguments in API calls:
        var object = req.body;
        var options = _.extend({}, req.files, req.query, req.params);
        
        // If this is a GET, or a DELETE, req.body should be null, so we only have options (route and query params)
        // If this is a PUT, POST, or PATCH, req.body is an object
        if (_.isEmpty(object)) {
            object = options;
            options = {};
        }

        return apiMethod(object, options).then(function (result) {
            //If not apiData, wrap it
            if (!result.apiData) {
                result = {
                    apiData: result
                };
            }
            
            //If not apiStatus, append it with default HTTP:200 OK
            if (!result.apiStatus) {
                result.apiStatus = 200;
            }

            response = result;
        }).catch(function (err) {
            //If not apiData, wrap it
            if (!err.apiData) {
                err = {
                    apiData: err
                };
            }
            
            //If not apiStatus, append it with default HTTP:%00 Server Inernal Error
            if (!err.apiStatus) {
                err.apiStatus = 500;
            }
            
            response = err;
        }).finally(function () {
            res.status(response.apiStatus).json(response.apiData || {});
        });
    };
}
