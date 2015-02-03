//Main Route
var express = require('express');
var router = express.Router();
var api = require('../api');

router.get('/:account/:table', api.http(api.live.query));
router.get('/:account/:table/:key', api.http(api.live.item));
router.post('/:account/:table', api.http(api.live.insert));
router.put('/:account/:table/:key', api.http(api.live.update));

module.exports = router;
