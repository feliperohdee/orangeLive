// # Errors Middleware
var errors = require('errors');

module.exports = {
    generalError: generalError,
    notFoundError: notFoundError
};

/* ======================================================================== */

//Node.JS Error
function generalError(err, req, res, next) {
    var err = new errors.Http500Error();

    res.status(err.status).render('error', {
        title: 'HTTP/1.1 500 {' + err.message + '}',
        text: process.env.NODE_ENV === 'development' ? err.stack : null
    });
}

//404
function notFoundError(req, res, next) {
    var err = new errors.Http404Error();

    res.status(err.status).render('error', {
        title: 'HTTP/1.1 404 Not Found',
        text: process.env.NODE_ENV === 'development' ? err.stack : null
    });
}