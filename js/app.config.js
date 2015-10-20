/**
 * app.config
 */
(function() {

	'use strict';

	angular.module('app.config', ['hljs']).config(['hljsServiceProvider', appConfig]);

	function appConfig(hljsServiceProvider) {
	/*
	 *	Setup Angular highlight
	 */
	 hljsServiceProvider.setOptions({
	 	tabReplace: '   '
	 });
	}
})();
