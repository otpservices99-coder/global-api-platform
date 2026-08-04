const mongoose = require("mongoose");


const userRoleSchema = new mongoose.Schema({


project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


user:{

type:mongoose.Schema.Types.ObjectId,

ref:"User",

required:true

},


role:{

type:mongoose.Schema.Types.ObjectId,

ref:"Role",

required:true

}


},
{
timestamps:true
});


module.exports =
mongoose.model(
"UserRole",
userRoleSchema
);
