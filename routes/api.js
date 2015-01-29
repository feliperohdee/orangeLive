//Main Route
var express = require('express');
var router = express.Router();
var api = require('../api');

router.get('/:namespace', api.http(api.live.query));
router.get('/:namespace/:where', api.http(api.live.item));

module.exports = router;
