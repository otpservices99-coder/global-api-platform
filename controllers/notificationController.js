const Notification = require("../models/Notification");


// GET USER NOTIFICATIONS
const getNotifications = async(req,res)=>{

try{

const notifications =
await Notification.find({

project:req.project._id,
user:req.user.id

})
.sort({
createdAt:-1
});


res.json({

success:true,
data:notifications

});


}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}

};




// MARK AS READ
const markRead = async(req,res)=>{

try{


const notification =
await Notification.findOneAndUpdate(

{
_id:req.params.id,
project:req.project._id,
user:req.user.id
},

{
read:true
},

{
new:true
}

);



if(!notification){

return res.status(404).json({

success:false,
message:"Notification not found"

});

}



res.json({

success:true,
data:notification

});


}catch(error){

res.status(500).json({

success:false,
message:error.message

});

}


};



module.exports={

getNotifications,
markRead

};
