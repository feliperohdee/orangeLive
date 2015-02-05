var debug = require('debug')('orangeLive');
var express = require('express');

/*==== Servers Config =====*/

var app = express();

// HTTP Server
var server = app.listen(process.env.PORT || 3000, function () {
    debug('Express server listening on port ' + server.address().port);
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
var errors = require('./errors');
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

/*===========================*/

app.use('/api', routes.api);

/*===========================*/

//Final Error Handlers
app.use(middleware.errors.generalError);
app.use(middleware.errors.notFoundError);

module.exports = app;
