angular.module('app').controller('mainController', ['$interval', '$filter', mainController]);

/**
 * [mainController]
 */
 function mainController($interval, $filter) {
 	var self = this;

 	json();
 	chart();
 	players();

 	self.declarationSrc =
 	'// Orange Live Constructor' + '\n' +
 	'var orangeLive = new OrangeLive();' + '\n' +
 	'' + '\n' +
 	'// Get a collection\'s instance' + '\n' +
 	'var collectionInstance = orangeLive.instance(\'dlBSd$ib89$Be2/users\');' + '\n' +
 	'' + '\n' +
 	'// Define collection index' + '\n' +
 	'collectionInstance.indexedBy(\'age\');' + '\n' +
 	'' + '\n' +
 	'// Define collection limit' + '\n' +
 	'collectionInstance.first(10);' + '\n' +
 	'' + '\n' +
 	'// Apply an index filter in descending order' + '\n' +
 	'collectionInstance.greaterThan(21).desc();' + '\n' +
 	'' + '\n' +
 	'// Get an item\'s instance' + '\n' +
 	'var itemInstance = orangeLive.instance(\'dlBSd$ib89$Be2/users/1\');';

 	self.listenerSrc =
 	'// Start listen load event' + '\n' +
 	'collectionInstance.on(\'load\', function (data, count, pagination) {' + '\n' +
 	'	// Get data key' + '\n' +
 	'	data.key();' + '\n' +
 	'' + '\n' +
 	'	// Get data value' + '\n' +
 	'	data.value();' + '\n' +
 	'' + '\n' +
 	'	// Value also supports arguments to crawl object' + '\n' +
 	'	data.value(\'user.stats.clicks\');' + '\n' +
 	'' + '\n' +
 	'	// Save data' + '\n' +
 	'	data.save({});' + '\n' +
 	'' + '\n' +
 	'	// Remove data' + '\n' +
 	'	data.remove();' + '\n' +
 	'' + '\n' +
 	'	// Call pagination' + '\n' +
 	'	pagination.prev();' + '\n' +
 	'	pagination.next();' + '\n' +
 	'});';

self.otherEventsSrc =
 	'// Start listen fetch event' + '\n' +
 	'collectionInstance.on(\'fetch\', function (data) {' + '\n' +
 	'	updateView(data.value());' + '\n' +
 	'});' + '\n' +
	'' + '\n' +
	'// Start listen save event' + '\n' +
 	'collectionInstance.on(\'save\', function (data) {' + '\n' +
 	'	logChange(data.key());' + '\n' +
 	'});' + '\n' +
	'' + '\n' +
	'// Start listen save (just for update) event' + '\n' +
 	'collectionInstance.on(\'save:update\', function (data) {' + '\n' +
 	'	logChange(data.key());' + '\n' +
 	'});' + '\n' +
	'' + '\n' +
	'// Start listen remove event' + '\n' +
 	'collectionInstance.on(\'remove\', function (data) {' + '\n' +
 	'	logChange(data.key());' + '\n' +
 	'});' +
	'' + '\n';

	self.operationsSrc =
	'// Call save operation (might be insert or save, depending of context)' + '\n' +
	'itemInstance.save({' + '\n' +
	'	age: 22,' + '\n' +
	'	height: 178,' + '\n' +
	'});' + '\n' +
	'' + '\n' +
	'// Call remove operation' + '\n' +
	'itemInstance.remove(\'userKey\');' + '\n' +
	'' + '\n' +
	'// Call remove attribute operation (supports JSON path crawling)' + '\n' +
	'itemInstance.removeAttr(\'userKey\', \'authorizations.canDrink\');' + '\n' +
	'' + '\n' +
	'// Call save with condition operation (just updates in some circuntances)' + '\n' +
	'itemInstance.saveWithCondition(function(data){' + '\n' +
	'	if(data.age > 21){' + '\n' +
	'		return{' + '\n' +
	'			canDrink: true' + '\n' +
	'		};' + '\n' +
	'	}' + '\n' +
	'});' + '\n' +
	'' + '\n' +
	'// Call increment operation (supports JSON path crawling)' + '\n' +
 	'itemInstance.increment(\'user.stats.visits\', 1);' + '\n' +
 	'itemInstance.decrement(\'user.stats.visits\', 1);' + '\n' +
 	'' + '\n' +
 	'// Call push list operation (supports JSON path crawling)' + '\n' +
 	'itemInstance.pushList(\'user.stats.pageVisited\', \'products\');';

 	self.rules = 'users: {' + '\n' +
 	'	// # Access Control List' + '\n' +
 	'	acl: {' + '\n' +
 	'		_save: \'exists(auth.id) && auth.admin === true\',' + '\n' +
 	'		_remove: exists(auth.id),' + '\n' +
 	'		_read: \'true\'' + '\n' +
 	'	},' + '\n' +
 	'	// # Indexes' + '\n' +
 	'	indexes: {' + '\n' +
 	'		string: [\'name\'],' + '\n' +
 	'		number: [\'height\', \'age\']' + '\n' +
 	'	},' + '\n' +
 	'	// # Schema' + '\n' +
 	'	schema: {' + '\n' +
 	'		name: \'isString(data.name)\',' + '\n' +
 	'		age: \'isNumber(data.age) && data.age >= 0\',' + '\n' +
 	'		_other: true' + '\n' +
 	'	}' + '\n' +
 	'}';


 	/**
 	 * [json]
 	 */
 	 function json() {
 	 	self.hover = 4765;
 	 	self.clicks = 101;

 	 	$interval(function() {
 	 		self.hover++;
 	 	},500);

 	 	$interval(function() {
 	 		self.clicks++;
 	 	},1200);

 	 	self.atomicJSON = '{\n' +
 	 	'	"product": {\n' +
 	 	'		"stats": {\n' +
	 	'			"hover": "{{Ctrl.hover}}",\n' +
	 	'			"clicks": "{{Ctrl.clicks}}"\n' +
 	 	'		}\n' +
 	 	'	}\n' +
 	 	'}';
 	 }

	/**
	 * [charts]
	 */
	 function chart() {
	 	var chartLength = 10;
	 	var data = new Array(chartLength);
	 	var labels = new Array(chartLength);

	 	for (var i = 0; i < data.length; i++) {
	 		data[i] = getRandom(10,20);
	 	};

	 	$interval(function() {
	 		data.forEach(function(value, index) {
	 			data[index] = getRandom(10,20);
	 		});
	 	},1000);

	 	self.chart = {
	 		labels: labels,
	 		data: [data],
	 		colours: [{
	 			fillColor: '#35393b'
	 		}],
	 		options: {
	 			showScale: false,
	 			barShowStroke : false,
	 			barValueSpacing: 1,
	 			showTooltips : false
	 		}
	 	};
	 }

	 /**
	  * [players]
	  */
	 function players() {
	 	self.players = [];

	 	for (var i = 1; i < 5; i++) {
	 		self.players.push({
	 			name: 'Player ' + i,
	 			score: getRandom(10, 150)
	 		});
	 	};

	 	self.players = $filter('orderBy')(self.players, '-score');

	 	$interval(function() {
	 		self.players.forEach(function(p) {
	 			p.score = getRandom(10,150);
	 		});

	 		self.players = $filter('orderBy')(self.players, '-score');
	 	},1500);

	 	self.playersJSON = '{\n' +
 	 	'	"players": "{{Ctrl.players | json}}"\n' +
 	 	'}';
	 }

	 /**
	  * [getRandom]
	  * @return {integer} random number
	  */
	  function getRandom(min, max) {
	  	return Math.floor(Math.random() * (max - min + 1) + min);
	  }
	}
