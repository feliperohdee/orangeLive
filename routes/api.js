//Main Route
var express = require('express');
var router = express.Router();
var middleware = require('../middleware');
var api = require('../api');

// Apply CORS n' Auth policies
router.use(middleware.routes.enableCORS);

// # Delete
router.delete('/:account/:table/:key', middleware.auth.api, api.http(api.live.del));

// # Getters
router.get('/:account/:table', middleware.auth.api, api.http(api.live.query));
router.get('/:account/:table/:key', middleware.auth.api, api.http(api.live.item));
router.get('/:account/:table/:key/:select', middleware.auth.api, api.http(api.live.item));

// # Setters
router.post('/:account/:table', middleware.auth.api, api.http(api.live.insert));
router.put('/:account/:table/:key', middleware.auth.api, api.http(api.live.update));

module.exports = router;
