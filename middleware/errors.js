// # Errors Middleware
module.exports = {
    customError: customError,
    generalError: generalError,
    notFoundError: notFoundError
};

/* ======================================================================== */

//Custom
function customError(req, res, next) {
    var err = new Error(req.query.title || 'Unknwown Error');
    var status = req.query.status || 500;
    var title = 'HTTP/1.1 ' + status + ' {' + (err.message) + '}';
    var text = req.query.text || null;

    res.status(status).render('error', {
        title: title,
        text: text
    });
}

//Node.JS Error
function generalError(err, req, res, next) {
    var status = err.status || 500;
    var title = 'HTTP/1.1 ' + status + ' {' + err.message + '}';
    var text = process.env.NODE_ENV === 'development' ? err.stack : null;

    res.status(status).render('error', {
        title: title,
        text: text
    });
}

//404
function notFoundError(req, res, next) {
    var err = new Error('Not Found');
    var status = 404;
    var title = 'HTTP/1.1 404 Not Found';
    var text = process.env.NODE_ENV === 'development' ? err.stack : null;

    res.status(status).render('error', {
        title: title,
        text: text
    });
}