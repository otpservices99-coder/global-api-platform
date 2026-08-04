module.exports = function(
req,
res,
next
){


if(
req.user &&
req.user.platformRole === "super_admin"
){

return next();

}



return res.status(403).json({

success:false,

message:"Platform access denied"

});


};
