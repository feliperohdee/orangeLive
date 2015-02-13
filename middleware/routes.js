// # Routes Middleware

module.exports = {
    enableCORS: enableCORS
};

/* ======================================================================== */

// Enable CORS
function enableCORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    return next();
};