const Rule = require("../models/Rule");



// CREATE RULE

const createRule = async(req,res)=>{

    try{


        const rule = await Rule.create({

            project:req.project._id,

            name:req.body.name,

            trigger:req.body.trigger,

            conditions:req.body.conditions || {},

            action:req.body.action,

            actionData:req.body.actionData || {}

        });



        res.json({

            success:true,

            message:"Rule created",

            data:rule

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};






// GET RULES

const getRules = async(req,res)=>{


try{


const rules = await Rule.find({

    project:req.project._id

})
.sort({
    createdAt:-1
});



res.json({

success:true,

data:rules

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}



};







// UPDATE RULE STATUS

const toggleRule = async(req,res)=>{


try{


const rule = await Rule.findOne({

_id:req.params.id,

project:req.project._id

});



if(!rule){

return res.status(404).json({

success:false,

message:"Rule not found"

});

}



rule.status =
rule.status==="active"
?
"disabled"
:
"active";



await rule.save();



res.json({

success:true,

message:"Rule status updated",

data:rule

});



}catch(error){


res.status(500).json({

success:false,

message:error.message

});


}



};






module.exports={

createRule,

getRules,

toggleRule

};
