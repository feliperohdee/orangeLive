// # Config Passport
var passport = require('passport');
var bearer = require('passport-http-bearer').Strategy;
var jwt = require('jwt-simple');
var password = 'abc12345';

// ## Strategy used to authenticate API based on access token
passport.use('bearer', bearerStrategy());

/* ======================================================================== */

// # Bearer Strategy
function bearerStrategy() {
    return new bearer({
        passReqToCallback: true
    }, function (req, token, done) {
        //Decrypt Token
        try {
            //Decode Token
            var decodedToken = jwt.decode(token, password);

            //Success Callback, send decoded token
            return done(decodedToken);
        } catch (err) {
            // On catch, always reject callback
            return done(false);
        }
    });
}