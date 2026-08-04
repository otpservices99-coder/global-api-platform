const User = require("../models/User");
const Project = require("../models/Project");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// REGISTER USER

const registerUser = async (req,res)=>{

try{

const {
projectKey,
username,
email,
password
}=req.body;



if(!projectKey || !username || !email || !password){

return res.status(400).json({

success:false,
message:"projectKey, username, email and password are required"

});

}



const project = await Project.findOne({

status:"active",

apiKeys:{
$elemMatch:{
key:projectKey,
status:"active"
}
}

});



if(!project){

return res.status(401).json({

success:false,
message:"Invalid project key"

});

}



const existingUser =
await User.findOne({

$or:[
{
email
},
{
username
}
]

});



if(existingUser){

return res.status(400).json({

success:false,
message:"Username or email already exists"

});

}



const hashedPassword =
await bcrypt.hash(
password,
10
);



const user =
await User.create({

project:project._id,

username,

email,

password:hashedPassword

});



res.status(201).json({

success:true,

message:"Account created successfully",

user:{

id:user._id,

username:user.username,

email:user.email,

project:project.name

}

});



}catch(error){

res.status(500).json({

success:false,

message:error.message

});

}

};




// LOGIN USER

const loginUser = async(req,res)=>{

try{


const {
email,
password
}=req.body;



const user =
await User.findOne({
email
});



if(!user){

return res.status(400).json({

success:false,

message:"Invalid email or password"

});

}



const validPassword =
await bcrypt.compare(
password,
user.password
);



if(!validPassword){

return res.status(400).json({

success:false,

message:"Invalid email or password"

});

}




const token =
jwt.sign(

{

id:user._id,

role:user.role,

platformRole:user.platformRole,

project:user.project

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

);




user.lastLogin = new Date();

await user.save();



res.json({

success:true,

message:"Login successful",

token,

user:{

id:user._id,

username:user.username,

email:user.email,

role:user.role,

platformRole:user.platformRole,

project:user.project

}

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});

}


};




module.exports={

registerUser,

loginUser

};
