const requirePermission = (permission)=>{

return (req,res,next)=>{

if(!req.user){

return res.status(401).json({

success:false,
message:"Not authenticated"

});

}



// Platform Super Admin bypass

if(req.user.platformRole==="super_admin"){

return next();

}



// No roles assigned

if(

!req.user.roles ||

!Array.isArray(req.user.roles)

){

return res.status(403).json({

success:false,
message:"No roles assigned"

});

}



// Collect all permissions from every role

const permissions=[];

for(const role of req.user.roles){

if(!role) continue;

if(!role.enabled) continue;

if(!role.permissions) continue;

for(const perm of role.permissions){

permissions.push(perm);

}

}



// Wildcard permission

if(

permissions.some(

p=>

p.resource==="*" &&

p.operation==="*" &&

p.effect==="allow"

)

){

return next();

}



// Check requested permission

const [resource,operation]=permission.split(".");



const allowed = permissions.some(p=>{

if(p.effect!=="allow"){

return false;

}



const resourceMatch =

p.resource==="*" ||

p.resource===resource;



const operationMatch =

p.operation==="*" ||

p.operation===operation;



return resourceMatch && operationMatch;

});



if(allowed){

return next();

}



return res.status(403).json({

success:false,
message:"Permission denied"

});

};

};



const admin=requirePermission("users.manage");

admin.requirePermission=requirePermission;

module.exports=admin;
