// # Orange Live
function OrangeLive() {
    //
    'use strict';

    var self = this;
    
    self.instances = [];
}

// # Instance
OrangeLive.prototype.instance = function (address) {
    //
    var self = this;
    
    var instance = new self.Instance(address);

    // Store a instance reference
    self.instances.push(instance);

    // Expose just API
    return instance.api();
};