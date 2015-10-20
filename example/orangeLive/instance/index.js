// # Orange Live > Instance
function Instance(address, auth) {
    //
    var self = this;

    self.addressPath = {
        account: address.split('/')[0] || false,
        table: address.split('/')[1] || false,
        key: address.split('/')[2] || false
    };
    
    self.auth = auth;
    self.helpers = self.helpers();

    self.instance;
    self.isCollection = false;
    self.requestsManager = self.requests();
    self.responsesManager = self.responses();

    return __construct();

    /*=========================*/

    // # Construct
    function __construct() {
        //
        if (!self.addressPath.key) {
            // Create and return collection instance
            self.instance = self.collection();
            self.isCollection = true;
        } else {
            // Create and return item instance
            self.instance = self.item();
        }

            // Extend API with shared API
            self.instance.api = self.instance.api();

        // Return instance
        return self.instance;
    }
}