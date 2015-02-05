// # Live Security
var errors = require('errors');

var rules = {
    write: true,
    read: false
};

module.exports = {
    canRead: canRead,
    canWrite: canWrite,
    hasKey: hasKey
};

/*----------------------------*/

// # Can Read
function canRead(object) {
    var can = false;

    if (rules[object.table]) {
        can = rules[object.table].read;
    } else {
        can = rules.read;
    }

    if (!can) {
        throw new errors.securityError();
    }
}

// # Can Write
function canWrite(object) {
    var can = false;

    if (rules[object.table]) {
        can = rules[object.table].write;
    } else {
        can = rules.write;
    }

    if (!can) {
        throw new errors.securityError();
    }
}

// # Has Key
function hasKey(object){
    if(!object.key){
        throw new errors.missingKeyError();
    }
}