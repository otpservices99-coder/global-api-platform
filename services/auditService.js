const AuditLog = require("../models/AuditLog");


class AuditService {


async log({

project,

actor,

user = null,

action,

resource = "",

recordId = null,

metadata = {},

req = null

}){


return await AuditLog.create({

project,

user,

action,

resource,

recordId,

details:{

actor,

...metadata

},

ip:req?.ip || null

});


}



}


module.exports = new AuditService();
