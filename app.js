var express = require('express');

/*==== Servers Config =====*/
var app = express();

// HTTP Server
var server = app.listen(process.env.PORT || 3000, function () {
    console.log('Express server listening on port ' + server.address().port);
});

// Web Sockets
var WebSocketServer = require('ws').Server;
var ws = new WebSocketServer({
    server: server,
    verifyClient: function (info, accepts) {
        accepts(true, 404, 'Fuck U');
    }
});

// Expose ws as global
global.ws = ws;
/*==== Servers Config - End =====*/

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var hbs = require('hbs');
var errors = require('./errors');
var middleware = require('./middleware');
var routes = require('./routes');

// Disable x-powered-by
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', hbs.__express);

//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'example')));

/*===========================*/

app.use('/api', routes.api);

/*===========================*/

//Final Error Handlers
app.use(middleware.errors.generalError);
app.use(middleware.errors.notFoundError);

module.exports = app;
