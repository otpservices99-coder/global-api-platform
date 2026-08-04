const ApiUsage=require("../models/ApiUsage");


module.exports=async(req,res,next)=>{


try{


if(req.project){


await ApiUsage.create({

project:req.project._id,

endpoint:req.originalUrl,

method:req.method,

ip:req.ip

});


}


next();


}catch(error){


console.log(
"API meter error:",
error.message
);


next();


}


};
