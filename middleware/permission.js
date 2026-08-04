module.exports = function(permission){


return (req,res,next)=>{


const permissions =
req.apiKey?.permissions || [];



if(
permissions.includes("*") ||
permissions.includes(permission)
){

return next();

}



return res.status(403).json({

success:false,

message:"Permission denied"

});


};


};
