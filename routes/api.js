//Main Route
var express = require('express');
var router = express.Router();
var api = require('../api');

router.get('/:namespace', api.http(api.live.query));
router.get('/:namespace/:key', api.http(api.live.item));
router.post('/:namespace', api.http(api.live.insert));
router.put('/:namespace/:key', api.http(api.live.update));

module.exports = router;
