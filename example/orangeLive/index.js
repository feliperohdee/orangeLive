// # Orange Live
function OrangeLive() {
    //
    'use strict';

    var self = this;
    
    self.instances = [];
    self.auth = Auth();
}

// # Instance
OrangeLive.prototype.instance = function (address) {
    //
    var self = this;
    var instance = new Instance(address, self.auth);

    // Store a instance reference
    self.instances.push(instance);

    // Expose just API
    return instance.api;
};