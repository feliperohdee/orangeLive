// # Auth Middleware
var passport = require('passport');

module.exports = {
    api: api
};

/* ======================================================================== */

// # Authenticate API
function api(req, res, next) {
    return passport.authenticate('bearer', {
        session: false
    }, function (decodedToken) {

        if (decodedToken) {
            // Append auth data in req params
            req.params._auth = decodedToken;
        }

        //Go on
        return next();
    })(req, res, next);
}