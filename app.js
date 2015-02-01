var express = require('express');

// Start HTTP Server
var app = express();
var server = require('http').Server(app);

var redisAdapter = require('socket.io-redis');
var io = require('socket.io')(server).adapter(redisAdapter({
    host: 'localhost',
    port: 6379
}));

global.io = io;

// Requirements
var debug = require('debug')('orangeLive');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var hbs = require('hbs');
var middleware = require('./middleware');
var routes = require('./routes');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', hbs.__express);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

//Custom Error
app.use('/error', middleware.errors.customError);

/*===========================*/

var liveModel = require('./models/live');
app.use('/api', routes.api);

/*===========================*/

//Final Error Handlers
app.use(middleware.errors.generalError);
app.use(middleware.errors.notFoundError);


//Start server
server.listen(process.env.PORT || 3000, function () {
    debug('Express server listening on port ' + server.address().port);
});

module.exports = app;
