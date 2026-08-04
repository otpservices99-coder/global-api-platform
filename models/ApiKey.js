const mongoose = require("mongoose");


const apiKeySchema = new mongoose.Schema({

project:{

type:mongoose.Schema.Types.ObjectId,

ref:"Project",

required:true

},


key:{

type:String,

required:true,

unique:true

},


name:{

type:String,

default:"Default Key"

},


permissions:{

type:[String],

default:[
"*"
]

},


active:{

type:Boolean,

default:true

},


lastUsedAt:{

type:Date,

default:null

}


},
{
timestamps:true
});


module.exports = mongoose.model(
"ApiKey",
apiKeySchema
);
