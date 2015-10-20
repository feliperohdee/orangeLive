(function() {
    'use strict'

    angular.module('orangelive', []).controller('main', ['$scope', mainController]);

    /**
     * Main controller
     * @return
     */
    function mainController($scope) {
        var self = this;
        var orangeLive = new OrangeLive();

        // Instance key can be anything
        var usersCollection = orangeLive.instance('dlBSd$ib89$Be2/users').limit(5).indexedBy('age')
            .on('load', function(data, count, pagination) {
                $scope.$apply(function() {
                    self.pagination = pagination;
                    self.data = data;
                });
            })
            .on('fetch', function(data, count) {
                console.log(count);
                $scope.$apply(function() {
                    self.data = data;
                });
            });

        self.add = function() {
            usersCollection.save({
                name: faker.name.findName(),
                age: Number(faker.random.number()),
                list: [faker.random.arrayElement(), faker.random.arrayElement()],
                finance: {
                    account: Number(faker.finance.account()),
                    amount: Number(faker.finance.amount())
                }
            });
        }
    }
})();
