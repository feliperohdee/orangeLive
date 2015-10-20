(function() {

	'use strict';

	angular.module('app').directive('typed', [typed]);

	function typed() {
		return{
			scope: {
				model: '=typed'
			},
			link: linkFn
		};
	}

	/*===================================*/

	function linkFn($scope, $el, $attr) {

		$el.typed({
			strings: $scope.model.strings,
			loop: true,
			typeSpeed: 20,
			backSpeed: 20,
			backDelay: 1500,
			cursorChar: ''
		});
	}
})();
