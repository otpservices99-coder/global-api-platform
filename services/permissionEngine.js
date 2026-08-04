const Role=require("../models/Role");


exports.check=async(
user,
resource,
operation
)=>{


if(user.platformRole==="super_admin"){

return true;

}


if(!user.role){

return false;

}


const role=await Role.findById(user.role)
.populate("permissions");


if(!role || !role.enabled){

return false;

}


let allowed=false;


for(const permission of role.permissions){


if(permission.effect==="deny"){

if(
(permission.resource==="*" ||
permission.resource===resource)
&&
(permission.operation==="*" ||
permission.operation===operation)
){

return false;

}

}



if(permission.effect==="allow"){

if(
(permission.resource==="*" ||
permission.resource===resource)
&&
(permission.operation==="*" ||
permission.operation===operation)
){

allowed=true;

}

}


}


return allowed;


};
